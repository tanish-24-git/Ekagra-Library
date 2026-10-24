import { relations } from "drizzle-orm";
import {
  date,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

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
});

export const students = pgTable("students", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  examTarget: examTargetEnum("exam_target").notNull(),
  examOther: text("exam_other"),
  address: text("address"),
  // Store only the last four digits of Aadhaar or other ID numbers.
  idProofType: text("id_proof_type"),
  idProofLast4: text("id_proof_last4"),
  emergencyName: text("emergency_name"),
  emergencyPhone: text("emergency_phone"),
  joinedOn: date("joined_on").notNull(),
  status: studentStatusEnum("status").default("active").notNull(),
  notes: text("notes"),
  ...timestamps,
});

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
});

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
});

export const enquiries = pgTable("enquiries", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  preparingFor: text("preparing_for"),
  reason: text("reason"),
  status: enquiryStatusEnum("status").default("new").notNull(),
  ...timestamps,
});

export const studentsRelations = relations(students, ({ many }) => ({
  memberships: many(memberships),
  payments: many(payments),
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
