import { relations } from "drizzle-orm";
import {
  customType,
  date,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Binary column. Written as Postgres hex text so it works over Neon's HTTP driver.
const bytea = customType<{ data: Buffer; driverData: string | Buffer }>({
  dataType: () => "bytea",
  toDriver: (value) => `\\x${value.toString("hex")}`,
  fromDriver: (value) => (typeof value === "string" ? Buffer.from(value.replace(/^\\x/, ""), "hex") : Buffer.from(value)),
});

// Every table has row-level security on (.enableRLS()) with no policies. The site
// connects as the tables' owner, which RLS doesn't restrict, so it works as
// normal; any other role, such as Neon's Data API roles, sees no rows.

// A member either keeps a reserved desk or sits at any free seat.
export const seatingEnum = pgEnum("seating", ["reserved", "open"]);
export const studentStatusEnum = pgEnum("student_status", ["active", "expired", "left"]);
export const examTargetEnum = pgEnum("exam_target", [
  "mpsc_rajyaseva",
  "mpsc_combined",
  "upsc_cse",
  "neet",
  "jee",
  "banking",
  "ssc",
  "police_bharti",
  "tet",
  "other",
]);
export const paymentModeEnum = pgEnum("payment_mode", ["cash", "upi", "card", "bank_transfer"]);
export const enquiryStatusEnum = pgEnum("enquiry_status", ["new", "contacted", "joined", "closed"]);
export const documentKindEnum = pgEnum("document_kind", ["aadhaar", "pan", "driving_licence"]);
// Who a fee reminder went to: the owner's daily list, or the student by email.
export const reminderKindEnum = pgEnum("reminder_kind", ["owner", "student_email"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

export const seats = pgTable("seats", {
  id: serial("id").primaryKey(),
  number: text("number").notNull().unique(),
  ...timestamps,
}).enableRLS();

export const students = pgTable("students", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  examTarget: examTargetEnum("exam_target").notNull(),
  examOther: text("exam_other"),
  address: text("address"),
  // ID numbers are encrypted (src/lib/crypto-box.ts). The last four
  // characters are kept in the clear so the admin can show a masked number.
  aadhaarEnc: text("aadhaar_enc"),
  aadhaarLast4: text("aadhaar_last4"),
  panEnc: text("pan_enc"),
  panLast4: text("pan_last4"),
  emergencyName: text("emergency_name"),
  emergencyPhone: text("emergency_phone"),
  joinedOn: date("joined_on").notNull(),
  status: studentStatusEnum("status").default("active").notNull(),
  notes: text("notes"),
  ...timestamps,
}).enableRLS();

export const memberships = pgTable("memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  seatId: integer("seat_id").references(() => seats.id, { onDelete: "set null" }),
  seating: seatingEnum("seating").notNull(),
  startsOn: date("starts_on").notNull(),
  endsOn: date("ends_on").notNull(),
  feeInr: integer("fee_inr").notNull(),
  discountInr: integer("discount_inr").default(0).notNull(),
  ...timestamps,
}).enableRLS();

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  membershipId: uuid("membership_id").references(() => memberships.id, { onDelete: "set null" }),
  amountInr: integer("amount_inr").notNull(),
  mode: paymentModeEnum("mode").notNull(),
  paidOn: date("paid_on").notNull(),
  receiptNo: text("receipt_no"),
  note: text("note"),
  ...timestamps,
}).enableRLS();

export const enquiries = pgTable("enquiries", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  preparingFor: text("preparing_for"),
  reason: text("reason"),
  status: enquiryStatusEnum("status").default("new").notNull(),
  ...timestamps,
}).enableRLS();

// Photos or PDFs of a student's ID documents, one per kind, encrypted.
export const studentDocuments = pgTable(
  "student_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    kind: documentKindEnum("kind").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    data: bytea("data").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("student_documents_student_kind").on(t.studentId, t.kind)],
).enableRLS();

// One row per reminder sent, so each membership is reminded once per kind.
export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "cascade" }),
    kind: reminderKindEnum("kind").notNull(),
    sentTo: text("sent_to"),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("reminders_membership_kind").on(t.membershipId, t.kind)],
).enableRLS();

export const studentsRelations = relations(students, ({ many }) => ({
  memberships: many(memberships),
  payments: many(payments),
  documents: many(studentDocuments),
}));

export const studentDocumentsRelations = relations(studentDocuments, ({ one }) => ({
  student: one(students, { fields: [studentDocuments.studentId], references: [students.id] }),
}));

export const membershipsRelations = relations(memberships, ({ one, many }) => ({
  student: one(students, { fields: [memberships.studentId], references: [students.id] }),
  seat: one(seats, { fields: [memberships.seatId], references: [seats.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  student: one(students, { fields: [payments.studentId], references: [students.id] }),
  membership: one(memberships, { fields: [payments.membershipId], references: [memberships.id] }),
}));

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Membership = typeof memberships.$inferSelect;
export type Enquiry = typeof enquiries.$inferSelect;
export type Seating = (typeof seatingEnum.enumValues)[number];
export type ExamTarget = (typeof examTargetEnum.enumValues)[number];
export type DocumentKind = (typeof documentKindEnum.enumValues)[number];
export type PaymentMode = (typeof paymentModeEnum.enumValues)[number];
export type ReminderKind = (typeof reminderKindEnum.enumValues)[number];
