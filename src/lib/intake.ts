import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { intakeFiles, intakeSubmissions, studentDocuments, type DocumentKind, type ExamTarget, type IntakeForm, type IntakeStatus, type PaymentMode } from "@/db/schema";
import { open, openText, seal, sealText } from "./crypto-box";
import { indianMobile } from "./fields";

// Google Forms responses sent in by the Apps Script (scripts/google-forms/
// intake.gs → /api/intake/google-forms). The Google Form keeps its own copy;
// this is the second, encrypted copy that the admin reviews.
//
// Answers are matched by question title, ignoring case, spaces and
// punctuation, so "Primary mobile" and "primary mobile:" are the same.
// The titles the forms should use are in the setup guide (section 4).

export type IntakeAnswers = Record<string, string | string[]>;

const key = (title: string) => title.toLowerCase().replace(/[^a-z0-9]/g, "");

export function answer(answers: IntakeAnswers, ...titles: string[]): string {
  for (const t of titles) {
    const hit = Object.entries(answers).find(([k]) => key(k) === key(t));
    if (hit) return (Array.isArray(hit[1]) ? hit[1].join(", ") : hit[1]).trim();
  }
  return "";
}

const cleanPhone = (raw: string) => {
  const parsed = indianMobile.safeParse(raw);
  return parsed.success ? parsed.data : raw.trim() || null;
};

// File questions → the student document they become.
const FILE_KINDS: Record<string, DocumentKind> = {
  [key("Student photo")]: "photo",
  [key("Photo")]: "photo",
  [key("Aadhaar card")]: "aadhaar",
  [key("PAN card")]: "pan",
  [key("Driving licence")]: "driving_licence",
  [key("Driving license")]: "driving_licence",
};
export const documentKindFor = (question: string): DocumentKind | undefined => FILE_KINDS[key(question)];

const EXAMS: [RegExp, ExamTarget][] = [
  [/mpsc/i, "mpsc_rajyaseva"],
  [/upsc/i, "upsc_cse"],
  [/neet/i, "neet"],
  [/jee/i, "jee"],
  [/bank/i, "banking"],
  [/ssc/i, "ssc"],
  [/police/i, "police_bharti"],
  [/tet|tait/i, "tet"],
];
export const examFor = (text: string): ExamTarget => EXAMS.find(([re]) => re.test(text))?.[1] ?? "other";

const MODES: [RegExp, PaymentMode][] = [
  [/upi|gpay|phonepe|paytm/i, "upi"],
  [/cash/i, "cash"],
  [/card/i, "card"],
  [/bank|neft|imps|transfer/i, "bank_transfer"],
];

// What a payment form response says, in the shape a renewal needs.
export function paymentDetails(answers: IntakeAnswers) {
  const amount = Number(answer(answers, "Amount paid", "Amount").replace(/[^\d.]/g, ""));
  const months = Number.parseInt(answer(answers, "Months paid for", "Months"), 10);
  const mode = answer(answers, "Paid by", "Payment method");
  const date = answer(answers, "Payment date", "Date");
  return {
    amountInr: Number.isFinite(amount) ? Math.round(amount) : 0,
    months: months >= 1 && months <= 12 ? months : 1,
    mode: MODES.find(([re]) => re.test(mode))?.[1] ?? "upi",
    paidOn: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
  };
}

export type IntakeSummary = {
  id: string;
  form: IntakeForm;
  name: string | null;
  phone: string | null;
  status: IntakeStatus;
  studentId: string | null;
  submittedAt: string;
  answers: IntakeAnswers;
  files: { id: string; question: string; contentType: string }[];
};

function requireDb() {
  if (!db) throw new Error("The database isn't connected (DATABASE_URL).");
  return db;
}

export async function saveSubmission(input: { form: IntakeForm; responseId: string; answers: IntakeAnswers; submittedAt?: string }) {
  const d = requireDb();
  const values = {
    form: input.form,
    responseId: input.responseId,
    name: answer(input.answers, "Full name", "Name") || null,
    phone: cleanPhone(answer(input.answers, "Primary mobile", "Mobile", "Phone")),
    answersEnc: sealText(JSON.stringify(input.answers)),
    submittedAt: input.submittedAt ? new Date(input.submittedAt) : new Date(),
  };
  const [row] = await d
    .insert(intakeSubmissions)
    .values(values)
    .onConflictDoUpdate({ target: [intakeSubmissions.form, intakeSubmissions.responseId], set: { ...values, updatedAt: new Date() } })
    .returning({ id: intakeSubmissions.id });
  return row.id;
}

export async function saveSubmissionFile(input: { form: IntakeForm; responseId: string; question: string; contentType: string; bytes: Buffer }) {
  const d = requireDb();
  const [submission] = await d
    .select({ id: intakeSubmissions.id })
    .from(intakeSubmissions)
    .where(and(eq(intakeSubmissions.form, input.form), eq(intakeSubmissions.responseId, input.responseId)));
  if (!submission) return null;
  const values = { submissionId: submission.id, question: input.question, contentType: input.contentType, sizeBytes: input.bytes.length, data: seal(input.bytes) };
  await d
    .insert(intakeFiles)
    .values(values)
    .onConflictDoUpdate({ target: [intakeFiles.submissionId, intakeFiles.question], set: { ...values, updatedAt: new Date() } });
  return submission.id;
}

export async function listSubmissions(): Promise<IntakeSummary[]> {
  if (!db) return [];
  const [rows, files] = await Promise.all([
    db.select().from(intakeSubmissions).orderBy(desc(intakeSubmissions.createdAt)),
    db
      .select({ id: intakeFiles.id, submissionId: intakeFiles.submissionId, question: intakeFiles.question, contentType: intakeFiles.contentType })
      .from(intakeFiles),
  ]);
  return rows.map((r) => ({
    id: r.id,
    form: r.form,
    name: r.name,
    phone: r.phone,
    status: r.status,
    studentId: r.studentId,
    submittedAt: (r.submittedAt ?? r.createdAt).toISOString(),
    answers: JSON.parse(openText(r.answersEnc)) as IntakeAnswers,
    files: files.filter((f) => f.submissionId === r.id).map((f) => ({ id: f.id, question: f.question, contentType: f.contentType })),
  }));
}

export async function getSubmission(id: string): Promise<IntakeSummary | null> {
  if (!db || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return (await listSubmissions()).find((s) => s.id === id) ?? null;
}

export async function getSubmissionFileData(fileId: string): Promise<{ submissionId: string; question: string; contentType: string; bytes: Buffer } | null> {
  if (!db || !/^[0-9a-f-]{36}$/i.test(fileId)) return null;
  const [f] = await db.select().from(intakeFiles).where(eq(intakeFiles.id, fileId));
  return f ? { submissionId: f.submissionId, question: f.question, contentType: f.contentType, bytes: open(f.data) } : null;
}

export async function setSubmissionStatus(id: string, status: IntakeStatus, studentId?: string) {
  if (!db || !/^[0-9a-f-]{36}$/i.test(id)) return;
  await db.update(intakeSubmissions).set({ status, ...(studentId ? { studentId } : {}) }).where(eq(intakeSubmissions.id, id));
}

// Copies a registration's uploaded files onto the new student as their ID
// documents, except kinds the admin uploaded themselves. The files are
// already encrypted with the same key, so they're copied as they are.
export async function attachIntakeFiles(submissionId: string, studentId: string, skip: DocumentKind[]) {
  if (!db) return;
  const files = await db.select().from(intakeFiles).where(eq(intakeFiles.submissionId, submissionId));
  const docs = files
    .map((f) => ({ f, kind: documentKindFor(f.question) }))
    .filter((x): x is { f: (typeof files)[number]; kind: DocumentKind } => !!x.kind && !skip.includes(x.kind));
  if (!docs.length) return;
  await db
    .insert(studentDocuments)
    .values(docs.map(({ f, kind }) => ({ studentId, kind, contentType: f.contentType, sizeBytes: f.sizeBytes, data: f.data })))
    .onConflictDoNothing();
}
