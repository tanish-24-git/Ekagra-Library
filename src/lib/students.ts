import "server-only";
import { and, desc, eq, getTableColumns, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { enquiries, memberships, payments, reminders, seats, studentDocuments, students } from "@/db/schema";
import type { DocumentKind, ExamTarget, PaymentMode, ReminderKind, Seating } from "@/db/schema";
import { open, openText, seal, sealText } from "./crypto-box";
import { buildMockEnquiries, buildMockStudents } from "./mock-data";
import type { EnquiryInput } from "./enquiry";
import type { CreateStudentInput, RenewInput } from "./validation";

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
  email: string | null;
  // The latest membership, which reminders and renewals refer to.
  membershipId: string | null;
};

export type PaymentRecord = { id: string; amountInr: number; mode: PaymentMode; paidOn: string };

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

// A membership counts as due this many days before it ends. Reminders go out then.
export const REMIND_DAYS_BEFORE = 10;

const DAY = 86_400_000;
const todayIso = () => new Date().toISOString().slice(0, 10);

export function feeStatus(endsOn: string | null, today = todayIso()): FeeStatus {
  if (!endsOn) return { kind: "none", days: 0 };
  const days = Math.round((Date.parse(endsOn) - Date.parse(today)) / DAY);
  if (days < 0) return { kind: "overdue", days: -days };
  if (days <= REMIND_DAYS_BEFORE) return { kind: "due", days };
  return { kind: "paid", days };
}

export function addMonths(isoDate: string, months: number) {
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
  payments: (PaymentRecord & { studentId: string })[];
  reminders: { membershipId: string; kind: ReminderKind }[];
};
const g = globalThis as typeof globalThis & { __ekagraMockV4?: MockStore };
function mock(): MockStore {
  g.__ekagraMockV4 ??= {
    students: buildMockStudents(),
    enquiries: buildMockEnquiries(),
    idNumbers: {},
    documents: [],
    payments: [],
    reminders: [],
  };
  return g.__ekagraMockV4;
}

export async function listStudents(where?: SQL): Promise<StudentRecord[]> {
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
        membershipId: memberships.id,
      })
      .from(students)
      .leftJoin(memberships, eq(memberships.studentId, students.id))
      .leftJoin(seats, eq(seats.id, memberships.seatId))
      .where(where)
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
    email: r.email,
    membershipId: r.membershipId,
  }));
}

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export async function getStudent(id: string): Promise<StudentRecord | null> {
  if (!db) return mock().students.find((s) => s.id === id) ?? null;
  if (!isUuid(id)) return null;
  const [student] = await listStudents(eq(students.id, id));
  return student ?? null;
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
      email: input.email ?? null,
      membershipId: `mock-m-${crypto.randomUUID()}`,
    };
    const store = mock();
    store.students.unshift(record);
    store.payments.push({ id: crypto.randomUUID(), studentId: record.id, amountInr: input.feeInr * input.months, mode: input.paymentMode, paidOn: startsOn });
    store.idNumbers[record.id] = { aadhaar: idNumbers.aadhaarEnc ?? undefined, pan: idNumbers.panEnc ?? undefined };
    store.documents.push(...documents.map((d) => ({ studentId: record.id, kind: d.kind, contentType: d.contentType, data: seal(d.bytes) })));
    return record;
  }

  const studentId = crypto.randomUUID();
  const membershipId = crypto.randomUUID();
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
    id: membershipId,
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

  // The joining payment covers every month paid for up front.
  const insertPayment = db
    .insert(payments)
    .values({ studentId, membershipId, amountInr: input.feeInr * input.months, mode: input.paymentMode, paidOn: startsOn });

  // One HTTP round trip to Neon, run as a single transaction.
  await db.batch([insertStudent, ...insertSeat, insertMembership, insertPayment, ...insertDocuments]);

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
    email: input.email ?? null,
    membershipId,
  };
}

// Records a payment and adds a new membership period. It starts where the
// current one ends, or today if that has already passed.
export async function renewStudent(studentId: string, input: RenewInput): Promise<StudentRecord | null> {
  const current = await getStudent(studentId);
  if (!current) return null;
  const today = todayIso();
  const startsOn = current.endsOn && current.endsOn > today ? current.endsOn : today;
  const endsOn = addMonths(startsOn, input.months);
  const monthlyFee = current.feeInr ?? Math.round(input.amountInr / input.months);

  if (!db) {
    const membershipId = `mock-m-${crypto.randomUUID()}`;
    Object.assign(current, { endsOn, membershipId, status: "active", feeInr: monthlyFee });
    mock().payments.push({ id: crypto.randomUUID(), studentId, amountInr: input.amountInr, mode: input.mode, paidOn: today });
    return current;
  }

  const membershipId = crypto.randomUUID();
  await db.batch([
    db.insert(memberships).values({
      id: membershipId,
      studentId,
      seatId: current.seatNumber ? sql`(select ${seats.id} from ${seats} where ${seats.number} = ${current.seatNumber})` : null,
      seating: current.seating ?? "open",
      startsOn,
      endsOn,
      feeInr: monthlyFee,
    }),
    db.insert(payments).values({ studentId, membershipId, amountInr: input.amountInr, mode: input.mode, paidOn: today }),
    db.update(students).set({ status: "active" }).where(eq(students.id, studentId)),
  ]);
  return { ...current, endsOn, membershipId, status: "active", feeInr: monthlyFee };
}

export async function listPayments(studentId: string): Promise<PaymentRecord[]> {
  if (!db) return mock().payments.filter((p) => p.studentId === studentId).reverse();
  if (!isUuid(studentId)) return [];
  return db
    .select({ id: payments.id, amountInr: payments.amountInr, mode: payments.mode, paidOn: payments.paidOn })
    .from(payments)
    .where(eq(payments.studentId, studentId))
    .orderBy(desc(payments.paidOn), desc(payments.createdAt));
}

// Which reminders have already gone out for these memberships.
export async function sentReminders(membershipIds: string[]): Promise<{ membershipId: string; kind: ReminderKind }[]> {
  if (!membershipIds.length) return [];
  if (!db) return mock().reminders.filter((r) => membershipIds.includes(r.membershipId));
  return db
    .select({ membershipId: reminders.membershipId, kind: reminders.kind })
    .from(reminders)
    .where(inArray(reminders.membershipId, membershipIds));
}

export async function logReminders(rows: { membershipId: string; kind: ReminderKind; sentTo: string }[]) {
  if (!rows.length) return;
  if (!db) {
    mock().reminders.push(...rows.map(({ membershipId, kind }) => ({ membershipId, kind })));
    return;
  }
  await db.insert(reminders).values(rows).onConflictDoNothing();
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
