import { connection } from "next/server";
import { hiddenResponse, isAdmin } from "@/lib/admin-guard";
import { workbook, xlsxResponse, type Column } from "@/lib/excel";
import { listEnquiries, type EnquiryRecord } from "@/lib/students";

const statusLabels: Record<EnquiryRecord["status"], string> = { new: "New", contacted: "Contacted", joined: "Joined", closed: "Closed" };

// Excel download of every enquiry from the website form, newest first.
export async function GET() {
  await connection();
  if (!(await isAdmin())) return hiddenResponse();

  const enquiries = await listEnquiries();
  const columns: Column<EnquiryRecord>[] = [
    { header: "Received", width: 18, value: (e) => new Date(e.createdAt), format: "date" },
    { header: "Name", width: 24, value: (e) => e.name },
    { header: "Mobile", width: 14, value: (e) => e.phone },
    { header: "Lives in", width: 22, value: (e) => e.location },
    { header: "Preparing for", width: 26, value: (e) => e.preparingFor },
    { header: "Status", width: 12, value: (e) => statusLabels[e.status] },
    { header: "Why they want to join (older form)", width: 40, value: (e) => e.reason },
  ];

  const today = new Date().toISOString().slice(0, 10);
  return xlsxResponse(await workbook("Enquiries", columns, enquiries), `ekagra-enquiries-${today}.xlsx`);
}
