import "server-only";
import { desc, eq, getTableColumns } from "drizzle-orm";
import { db } from "@/db";
import { enquiries, memberships, seats, students } from "@/db/schema";
import type { ExamTarget, Seating } from "@/db/schema";
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
};

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
type MockStore = { students: StudentRecord[]; enquiries: EnquiryRecord[] };
const g = globalThis as typeof globalThis & { __ekagraMockV2?: MockStore };
function mock(): MockStore {
  g.__ekagraMockV2 ??= { students: buildMockStudents(), enquiries: buildMockEnquiries() };
  return g.__ekagraMockV2;
}

export async function listStudents(): Promise<StudentRecord[]> {
  if (!db) return [...mock().students];

  // One row per student, joined with their most recent membership.
  const rows = await db
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
    .orderBy(students.id, desc(memberships.endsOn));

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
  }));
}

export async function getStudent(id: string): Promise<StudentRecord | null> {
  const all = await listStudents();
  return all.find((s) => s.id === id) ?? null;
}

export async function createStudent(input: CreateStudentInput): Promise<StudentRecord> {
  const startsOn = todayIso();
  const endsOn = addMonths(startsOn, input.months);
  const seatNumber = input.seating === "reserved" ? (input.seatNumber ?? null) : null;

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
    };
    mock().students.unshift(record);
    return record;
  }

  const [student] = await db
    .insert(students)
    .values({
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
      examTarget: input.examTarget,
      emergencyName: input.emergencyName,
      emergencyPhone: input.emergencyPhone,
      notes: input.notes,
      joinedOn: startsOn,
    })
    .returning();

  // Reserved desks are created on first use, so seat numbers don't need seeding.
  const seat = seatNumber
    ? (
        await db
          .insert(seats)
          .values({ number: seatNumber })
          .onConflictDoUpdate({ target: seats.number, set: { number: seatNumber } })
          .returning({ id: seats.id })
      )[0]
    : undefined;

  await db.insert(memberships).values({
    studentId: student.id,
    seatId: seat?.id,
    seating: input.seating,
    startsOn,
    endsOn,
    feeInr: input.feeInr,
  });

  return (await getStudent(student.id))!;
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
export async function seatSummary(totalSeats: number) {
  const active = (await listStudents()).filter((s) => s.status === "active");
  const reserved = active.filter((s) => s.seating === "reserved").length;
  const open = active.filter((s) => s.seating === "open").length;
  return { totalSeats, reserved, open, freeForOpenSeating: Math.max(totalSeats - reserved, 0) };
}

export const isUsingMockData = () => !db;
