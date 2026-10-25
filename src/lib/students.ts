import "server-only";
import { and, desc, eq, getTableColumns, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { enquiries, memberships, payments, reminders, seats, studentDocuments, students } from "@/db/schema";
import type { DocumentKind, ExamTarget, PaymentMode, ReminderKind, Seating } from "@/db/schema";
import { open, openText, seal, sealText } from "./crypto-box";
import { buildMockEnquiries, buildMockStudents } from "./mock-data";
import type { EnquiryInput } from "./enquiry";
import type { CreateStudentInput, EditStudentInput, RenewInput } from "./validation";

// Data access for the admin and API routes. Uses Neon through Drizzle when
// DATABASE_URL is set, otherwise an in-memory store seeded with mock rows.
// Callers must be request-time code (after `connection()` or inside a
// request handler), because mock seeding reads the current date.

export type StudentRecord = {
  id: string;
  fullName: string;
  phone: string;
  examTarget: ExamTarget;
  status: "active" | "expired" | "left" | "paused";
  pausedOn: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  notes: string | null;
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

export function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
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
    pausedOn: r.pausedOn,
    emergencyName: r.emergencyName,
    emergencyPhone: r.emergencyPhone,
    notes: r.notes,
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
      pausedOn: null,
      emergencyName: input.emergencyName ?? null,
      emergencyPhone: input.emergencyPhone ?? null,
      notes: input.notes ?? null,
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
    pausedOn: null,
    emergencyName: input.emergencyName ?? null,
    emergencyPhone: input.emergencyPhone ?? null,
    notes: input.notes ?? null,
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

// Saves edits: the student's details, their current seat and monthly fee, any
// new ID numbers (blank ones keep what's saved) and any new documents, which
// replace the old ones of the same kind. One round trip.
export async function updateStudent(id: string, input: EditStudentInput, documents: NewDocument[] = []): Promise<StudentRecord | null> {
  const current = await getStudent(id);
  if (!current) return null;
  const seatNumber = input.seating === "reserved" ? (input.seatNumber ?? null) : null;
  const details = {
    fullName: input.fullName,
    phone: input.phone,
    email: input.email ?? null,
    examTarget: input.examTarget,
    emergencyName: input.emergencyName ?? null,
    emergencyPhone: input.emergencyPhone ?? null,
    notes: input.notes ?? null,
    ...(input.aadhaar ? { aadhaarEnc: sealText(input.aadhaar), aadhaarLast4: input.aadhaar.slice(-4) } : {}),
    ...(input.pan ? { panEnc: sealText(input.pan), panLast4: input.pan.slice(-4) } : {}),
  };

  if (!db) {
    const store = mock();
    Object.assign(current, {
      fullName: details.fullName,
      phone: details.phone,
      email: details.email,
      examTarget: details.examTarget,
      seating: input.seating,
      seatNumber,
      feeInr: input.feeInr,
      emergencyName: details.emergencyName,
      emergencyPhone: details.emergencyPhone,
      notes: details.notes,
      ...(input.aadhaar ? { aadhaarLast4: details.aadhaarLast4 } : {}),
      ...(input.pan ? { panLast4: details.panLast4 } : {}),
    });
    store.idNumbers[id] = { ...store.idNumbers[id], ...(input.aadhaar ? { aadhaar: details.aadhaarEnc } : {}), ...(input.pan ? { pan: details.panEnc } : {}) };
    for (const d of documents) {
      store.documents = store.documents.filter((x) => !(x.studentId === id && x.kind === d.kind));
      store.documents.push({ studentId: id, kind: d.kind, contentType: d.contentType, data: seal(d.bytes) });
    }
    current.documents = [...new Set([...current.documents, ...documents.map((d) => d.kind)])];
    return current;
  }

  await db.batch([
    db.update(students).set(details).where(eq(students.id, id)),
    ...(seatNumber ? [db.insert(seats).values({ number: seatNumber }).onConflictDoNothing()] : []),
    ...(current.membershipId
      ? [
          db
            .update(memberships)
            .set({
              seating: input.seating,
              seatId: seatNumber ? sql`(select ${seats.id} from ${seats} where ${seats.number} = ${seatNumber})` : null,
              feeInr: input.feeInr,
            })
            .where(eq(memberships.id, current.membershipId)),
        ]
      : []),
    ...(documents.length
      ? [
          db
            .insert(studentDocuments)
            .values(documents.map((d) => ({ studentId: id, kind: d.kind, contentType: d.contentType, sizeBytes: d.bytes.length, data: seal(d.bytes) })))
            .onConflictDoUpdate({
              target: [studentDocuments.studentId, studentDocuments.kind],
              set: {
                contentType: sql`excluded.content_type`,
                sizeBytes: sql`excluded.size_bytes`,
                data: sql`excluded.data`,
                updatedAt: new Date(),
              },
            }),
        ]
      : []),
  ]);
  return getStudent(id);
}

const daysBetween = (from: string, to: string) => Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / DAY));

// Freezes an active membership. No reminders go out while it's paused.
export async function pauseStudent(id: string): Promise<boolean> {
  const current = await getStudent(id);
  if (!current || current.status !== "active") return false;
  const today = todayIso();
  if (!db) {
    Object.assign(current, { status: "paused", pausedOn: today });
    return true;
  }
  await db.update(students).set({ status: "paused", pausedOn: today }).where(eq(students.id, id));
  return true;
}

// Unfreezes it. The end date moves on by the days it was paused, if the
// membership was still running when it was paused.
export async function resumeStudent(id: string): Promise<{ endsOn: string | null; days: number } | null> {
  const current = await getStudent(id);
  if (!current || current.status !== "paused") return null;
  const today = todayIso();
  const days = current.pausedOn ? daysBetween(current.pausedOn, today) : 0;
  const extend = !!(current.endsOn && current.pausedOn && current.endsOn >= current.pausedOn && days > 0);
  const endsOn = extend ? addDays(current.endsOn!, days) : current.endsOn;

  if (!db) {
    Object.assign(current, { status: "active", pausedOn: null, endsOn });
    return { endsOn, days: extend ? days : 0 };
  }
  await db.batch([
    db.update(students).set({ status: "active", pausedOn: null }).where(eq(students.id, id)),
    ...(extend && current.membershipId ? [db.update(memberships).set({ endsOn: endsOn! }).where(eq(memberships.id, current.membershipId))] : []),
  ]);
  return { endsOn, days: extend ? days : 0 };
}

// Keeps the student and their history but takes them off the active list.
export async function markStudentLeft(id: string): Promise<boolean> {
  const current = await getStudent(id);
  if (!current) return false;
  if (!db) {
    Object.assign(current, { status: "left", pausedOn: null });
    return true;
  }
  await db.update(students).set({ status: "left", pausedOn: null }).where(eq(students.id, id));
  return true;
}

export async function deleteStudentDocument(studentId: string, kind: DocumentKind): Promise<void> {
  if (!db) {
    const store = mock();
    store.documents = store.documents.filter((d) => !(d.studentId === studentId && d.kind === kind));
    const s = store.students.find((x) => x.id === studentId);
    if (s) s.documents = s.documents.filter((k) => k !== kind);
    return;
  }
  if (!isUuid(studentId)) return;
  await db.delete(studentDocuments).where(and(eq(studentDocuments.studentId, studentId), eq(studentDocuments.kind, kind)));
}

export async function removeIdNumber(studentId: string, kind: "aadhaar" | "pan"): Promise<void> {
  const cleared = kind === "aadhaar" ? { aadhaarEnc: null, aadhaarLast4: null } : { panEnc: null, panLast4: null };
  if (!db) {
    const store = mock();
    if (store.idNumbers[studentId]) delete store.idNumbers[studentId][kind];
    const s = store.students.find((x) => x.id === studentId);
    if (s) Object.assign(s, kind === "aadhaar" ? { aadhaarLast4: null } : { panLast4: null });
    return;
  }
  if (!isUuid(studentId)) return;
  await db.update(students).set(cleared).where(eq(students.id, studentId));
}

// Removes the student for good, with their memberships, payments, reminders
// and ID documents (the foreign keys cascade).
export async function deleteStudent(id: string): Promise<boolean> {
  if (!db) {
    const store = mock();
    const before = store.students.length;
    store.students = store.students.filter((s) => s.id !== id);
    return store.students.length < before;
  }
  if (!isUuid(id)) return false;
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
