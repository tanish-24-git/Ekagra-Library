import { connection } from "next/server";
import { hiddenResponse, isAdmin } from "@/lib/admin-guard";
import { documentLabels } from "@/lib/documents";
import { excelDate, workbook, xlsxResponse, type Column } from "@/lib/excel";
import { formatAadhaar } from "@/lib/id-numbers";
import { examLabels, formatShortDate, formatTenure, seatingLabels } from "@/lib/labels";
import { feeStatus, listStudentsForExport } from "@/lib/students";

// Excel download of every student (active, paused and left) with their full
// details and ID numbers. Photos and document files are never included.
export async function GET() {
  await connection();
  if (!(await isAdmin())) return hiddenResponse();

  const today = new Date().toISOString().slice(0, 10);
  const students = await listStudentsForExport();
  type Row = (typeof students)[number];

  const status = (s: Row) =>
    s.status === "paused" ? `Paused${s.pausedOn ? ` since ${formatShortDate(s.pausedOn)}` : ""}` : s.status === "left" ? "Left" : s.status === "expired" ? "Expired" : "Active";
  const fees = (s: Row) => {
    if (s.status !== "active") return "";
    const f = feeStatus(s.endsOn, today);
    return f.kind === "overdue" ? `Overdue by ${f.days} days` : f.kind === "due" ? `Due in ${f.days} days` : f.kind === "paid" ? "Paid" : "No plan";
  };

  const columns: Column<Row>[] = [
    { header: "Name", width: 24, value: (s) => s.fullName },
    { header: "Status", width: 16, value: status },
    { header: "Primary mobile", width: 15, value: (s) => s.phone },
    { header: "Secondary mobile", width: 15, value: (s) => s.secondaryPhone },
    { header: "Email", width: 26, value: (s) => s.email },
    { header: "Address", width: 36, value: (s) => s.address },
    { header: "Studying or working in", width: 26, value: (s) => s.occupation },
    { header: "Preparing for", width: 18, value: (s) => examLabels[s.examTarget] },
    { header: "Seat", width: 15, value: (s) => (s.seating ? seatingLabels[s.seating] : "") },
    { header: "Desk", width: 8, value: (s) => s.seatNumber },
    { header: "Monthly fee", width: 12, value: (s) => s.feeInr, format: "inr" },
    { header: "Joined on", width: 13, value: (s) => excelDate(s.joinedOn), format: "date" },
    { header: "In the library for", width: 18, value: (s) => formatTenure(s.joinedOn, today) },
    { header: "Next renewal", width: 13, value: (s) => excelDate(s.endsOn), format: "date" },
    { header: "Fee status", width: 17, value: fees },
    { header: "Total paid", width: 12, value: (s) => s.totalPaid, format: "inr" },
    { header: "Payments", width: 10, value: (s) => s.paymentCount },
    { header: "Aadhaar number", width: 17, value: (s) => (s.aadhaar ? formatAadhaar(s.aadhaar) : "") },
    { header: "PAN number", width: 13, value: (s) => s.pan },
    { header: "Driving licence number", width: 20, value: (s) => s.licence },
    { header: "ID documents on file", width: 30, value: (s) => s.documents.map((k) => documentLabels[k]).join(", ") },
    { header: "Emergency contact", width: 20, value: (s) => s.emergencyName },
    { header: "Emergency mobile", width: 15, value: (s) => s.emergencyPhone },
    { header: "Notes", width: 30, value: (s) => s.notes },
  ];

  const rows = [...students].sort((a, b) => a.fullName.localeCompare(b.fullName));
  return xlsxResponse(await workbook("Students", columns, rows), `ekagra-students-${today}.xlsx`);
}
