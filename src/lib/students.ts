import "server-only";
import { and, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { db } from "@/db";
import { enquiries, memberships, seats, studentDocuments, students } from "@/db/schema";
import type { DocumentKind, ExamTarget, Seating } from "@/db/schema";
import { open, openText, seal, sealText } from "./crypto-box";
import { buildMockEnquiries, buildMockStudents } from "./mock-data";
import type { EnquiryInput } from "./enquiry";
import type { CreateStudentInput } from "./validation";

// Data access for the admin and API routes. Uses Neon through Drizzle when
// DATABASE_URL is set, otherwise an in-memory store seeded with mock rows.
// Callers must be request-time code (after `connection()` or inside a
// request handler), because mock seeding reads the current date.

export type StudentRecord = {
  id: string;
  fullName: string;
  phone: string;
  examTarget: ExamTarget;
  status: "active" | "expired" | "left";
  joinedOn: string;
  seating: Seating | null;
  seatNumber: string | null;
  endsOn: string | null;
  feeInr: number | null;
  aadhaarLast4: string | null;
  panLast4: string | null;
  // Which ID documents have been uploaded.
  documents: DocumentKind[];
};

export type NewDocument = { kind: DocumentKind; contentType: string; bytes: Buffer };

export type EnquiryRecord = {
  id: string;
  name: string;
  phone: string;
  preparingFor: string | null;
  reason: string | null;
  status: "new" | "contacted" | "joined" | "closed";
  createdAt: string;
};

export type FeeStatus = { kind: "paid" | "due" | "overdue" | "none"; days: number };

const DAY = 86_400_000;
const todayIso = () => new Date().toISOString().slice(0, 10);

export function feeStatus(endsOn: string | null, today = todayIso()): FeeStatus {
  if (!endsOn) return { kind: "none", days: 0 };
  const days = Math.round((Date.parse(endsOn) - Date.parse(today)) / DAY);
  if (days < 0) return { kind: "overdue", days: -days };
  if (days <= 7) return { kind: "due", days };
  return { kind: "paid", days };
}

function addMonths(isoDate: string, months: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

// In-memory store, kept on globalThis so it survives hot reloads in dev.
// Numbers and files are sealed here too, exactly as in the database.
type MockDocument = { studentId: string; kind: DocumentKind; contentType: string; data: Buffer };
type MockStore = {
  students: StudentRecord[];
  enquiries: EnquiryRecord[];
  idNumbers: Record<string, { aadhaar?: string; pan?: string }>;
  documents: MockDocument[];
};
const g = globalThis as typeof globalThis & { __ekagraMockV3?: MockStore };
function mock(): MockStore {
  g.__ekagraMockV3 ??= { students: buildMockStudents(), enquiries: buildMockEnquiries(), idNumbers: {}, documents: [] };
  return g.__ekagraMockV3;
}

export async function listStudents(): Promise<StudentRecord[]> {
  if (!db) return [...mock().students];

  // One row per student, joined with their most recent membership.
  const [rows, uploaded] = await Promise.all([
    db
      .selectDistinctOn([students.id], {
        ...getTableColumns(students),
        seating: memberships.seating,
        seatNumber: seats.number,
        endsOn: memberships.endsOn,
        feeInr: memberships.feeInr,
      })
      .from(students)
      .leftJoin(memberships, eq(memberships.studentId, students.id))
      .leftJoin(seats, eq(seats.id, memberships.seatId))
      .orderBy(students.id, desc(memberships.endsOn)),
    db.select({ studentId: studentDocuments.studentId, kind: studentDocuments.kind }).from(studentDocuments),
  ]);

  return rows.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    phone: r.phone,
    examTarget: r.examTarget,
    status: r.status,
    joinedOn: r.joinedOn,
    seating: r.seating,
    seatNumber: r.seatNumber,
    endsOn: r.endsOn,
    feeInr: r.feeInr,
    aadhaarLast4: r.aadhaarLast4,
    panLast4: r.panLast4,
    documents: uploaded.filter((d) => d.studentId === r.id).map((d) => d.kind),
  }));
}

export async function getStudent(id: string): Promise<StudentRecord | null> {
  const all = await listStudents();
  return all.find((s) => s.id === id) ?? null;
}

export async function createStudent(input: CreateStudentInput, documents: NewDocument[] = []): Promise<StudentRecord> {
  const startsOn = todayIso();
  const endsOn = addMonths(startsOn, input.months);
  const seatNumber = input.seating === "reserved" ? (input.seatNumber ?? null) : null;
  const idNumbers = {
    aadhaarEnc: input.aadhaar ? sealText(input.aadhaar) : null,
    aadhaarLast4: input.aadhaar?.slice(-4) ?? null,
    panEnc: input.pan ? sealText(input.pan) : null,
    panLast4: input.pan?.slice(-4) ?? null,
  };

  if (!db) {
    const record: StudentRecord = {
      id: `mock-${crypto.randomUUID()}`,
      fullName: input.fullName,
      phone: input.phone,
      examTarget: input.examTarget,
      status: "active",
      joinedOn: startsOn,
      seating: input.seating,
      seatNumber,
      endsOn,
      feeInr: input.feeInr,
      aadhaarLast4: idNumbers.aadhaarLast4,
      panLast4: idNumbers.panLast4,
      documents: documents.map((d) => d.kind),
    };
    const store = mock();
    store.students.unshift(record);
    store.idNumbers[record.id] = { aadhaar: idNumbers.aadhaarEnc ?? undefined, pan: idNumbers.panEnc ?? undefined };
    store.documents.push(...documents.map((d) => ({ studentId: record.id, kind: d.kind, contentType: d.contentType, data: seal(d.bytes) })));
    return record;
  }

  const studentId = crypto.randomUUID();
  const insertStudent = db.insert(students).values({
    id: studentId,
    fullName: input.fullName,
    phone: input.phone,
    email: input.email,
    examTarget: input.examTarget,
    emergencyName: input.emergencyName,
    emergencyPhone: input.emergencyPhone,
    notes: input.notes,
    joinedOn: startsOn,
    ...idNumbers,
  });

  // Reserved desks are created on first use, so seat numbers don't need seeding.
  const insertSeat = seatNumber ? [db.insert(seats).values({ number: seatNumber }).onConflictDoNothing()] : [];
  const insertMembership = db.insert(memberships).values({
    studentId,
    seatId: seatNumber ? sql`(select ${seats.id} from ${seats} where ${seats.number} = ${seatNumber})` : null,
    seating: input.seating,
    startsOn,
    endsOn,
    feeInr: input.feeInr,
  });
  const insertDocuments = documents.length
    ? [
        db.insert(studentDocuments).values(
          documents.map((d) => ({ studentId, kind: d.kind, contentType: d.contentType, sizeBytes: d.bytes.length, data: seal(d.bytes) })),
        ),
      ]
    : [];

  // One HTTP round trip to Neon, run as a single transaction.
  await db.batch([insertStudent, ...insertSeat, insertMembership, ...insertDocuments]);

  return {
    id: studentId,
    fullName: input.fullName,
    phone: input.phone,
    examTarget: input.examTarget,
    status: "active",
    joinedOn: startsOn,
    seating: input.seating,
    seatNumber,
    endsOn,
    feeInr: input.feeInr,
    aadhaarLast4: idNumbers.aadhaarLast4,
    panLast4: idNumbers.panLast4,
    documents: documents.map((d) => d.kind),
  };
}

export async function updateStudent(
  id: string,
  patch: Partial<Pick<StudentRecord, "fullName" | "phone" | "status">> & { notes?: string },
): Promise<StudentRecord | null> {
  if (!db) {
    const record = mock().students.find((s) => s.id === id);
    if (!record) return null;
    Object.assign(record, patch);
    return record;
  }
  const updated = await db.update(students).set(patch).where(eq(students.id, id)).returning({ id: students.id });
  return updated.length ? getStudent(id) : null;
}

export async function deleteStudent(id: string): Promise<boolean> {
  if (!db) {
    const store = mock();
    const before = store.students.length;
    store.students = store.students.filter((s) => s.id !== id);
    return store.students.length < before;
  }
  const deleted = await db.delete(students).where(eq(students.id, id)).returning({ id: students.id });
  return deleted.length > 0;
}

export type DocumentSummary = { kind: DocumentKind; contentType: string; sizeBytes: number };

export async function listStudentDocuments(studentId: string): Promise<DocumentSummary[]> {
  if (!db) {
    return mock()
      .documents.filter((d) => d.studentId === studentId)
      .map((d) => ({ kind: d.kind, contentType: d.contentType, sizeBytes: d.data.length - 28 }));
  }
  return db
    .select({ kind: studentDocuments.kind, contentType: studentDocuments.contentType, sizeBytes: studentDocuments.sizeBytes })
    .from(studentDocuments)
    .where(eq(studentDocuments.studentId, studentId));
}

// The decrypted file, for the admin's document viewer.
export async function getStudentDocument(studentId: string, kind: DocumentKind): Promise<{ contentType: string; bytes: Buffer } | null> {
  if (!db) {
    const doc = mock().documents.find((d) => d.studentId === studentId && d.kind === kind);
    return doc ? { contentType: doc.contentType, bytes: open(doc.data) } : null;
  }
  const [doc] = await db
    .select({ contentType: studentDocuments.contentType, data: studentDocuments.data })
    .from(studentDocuments)
    .where(and(eq(studentDocuments.studentId, studentId), eq(studentDocuments.kind, kind)));
  return doc ? { contentType: doc.contentType, bytes: open(doc.data) } : null;
}

// The full Aadhaar or PAN number, decrypted only when the admin asks for it.
export async function revealIdNumber(studentId: string, kind: "aadhaar" | "pan"): Promise<string | null> {
  if (!db) {
    const sealed = mock().idNumbers[studentId]?.[kind];
    return sealed ? openText(sealed) : null;
  }
  const [row] = await db
    .select({ aadhaar: students.aadhaarEnc, pan: students.panEnc })
    .from(students)
    .where(eq(students.id, studentId));
  const sealed = row?.[kind];
  return sealed ? openText(sealed) : null;
}

export async function listEnquiries(): Promise<EnquiryRecord[]> {
  if (!db) return [...mock().enquiries];
  const rows = await db.select().from(enquiries).orderBy(desc(enquiries.createdAt));
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export async function createEnquiry(input: EnquiryInput): Promise<EnquiryRecord> {
  if (!db) {
    const record: EnquiryRecord = {
      id: `mock-enq-${crypto.randomUUID()}`,
      name: input.name,
      phone: input.phone,
      preparingFor: input.preparingFor ?? null,
      reason: input.reason ?? null,
      status: "new",
      createdAt: new Date().toISOString(),
    };
    mock().enquiries.unshift(record);
    return record;
  }
  const [row] = await db.insert(enquiries).values(input).returning();
  return { ...row, createdAt: row.createdAt.toISOString() };
}

// How many active members keep a reserved desk and how many sit anywhere.
export async function seatSummary(totalSeats: number, list?: StudentRecord[]) {
  const active = (list ?? (await listStudents())).filter((s) => s.status === "active");
  const reserved = active.filter((s) => s.seating === "reserved").length;
  const open = active.filter((s) => s.seating === "open").length;
  return { totalSeats, reserved, open, freeForOpenSeating: Math.max(totalSeats - reserved, 0) };
}

export const isUsingMockData = () => !db;
