import "server-only";
import ExcelJS from "exceljs";

// Builds an .xlsx with one sheet in a standard layout: a bold, yellow, frozen
// header row with filters, thin borders, sensible column widths, real dates
// and rupee amounts. Phone and ID numbers stay text so Excel doesn't mangle them.

export type Column<Row> = {
  header: string;
  width: number;
  value: (row: Row) => string | number | Date | null | undefined;
  format?: "date" | "inr";
};

const thin = { style: "thin" as const, color: { argb: "FFBFBFBF" } };
const border = { top: thin, left: thin, bottom: thin, right: thin };

export async function workbook<Row>(sheetName: string, columns: Column<Row>[], rows: Row[]): Promise<ArrayBuffer> {
  const book = new ExcelJS.Workbook();
  book.creator = "Ekagra Library";
  book.created = new Date();
  const sheet = book.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 1 }] });

  sheet.columns = columns.map((c, i) => ({ header: c.header, key: `c${i}`, width: c.width }));
  for (const row of rows) {
    sheet.addRow(Object.fromEntries(columns.map((c, i) => [`c${i}`, c.value(row) ?? ""])));
  }

  columns.forEach((c, i) => {
    const col = sheet.getColumn(i + 1);
    if (c.format === "date") col.numFmt = "dd mmm yyyy";
    if (c.format === "inr") col.numFmt = '"₹"#,##0';
  });

  const header = sheet.getRow(1);
  header.height = 24;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FF000000" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = border;
  });
  sheet.eachRow((row, n) => {
    if (n === 1) return;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = border;
      cell.alignment = { vertical: "top", wrapText: true };
    });
  });
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

  return (await book.xlsx.writeBuffer()) as ArrayBuffer;
}

export const xlsxResponse = (data: ArrayBuffer, filename: string) =>
  new Response(data, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });

// Excel dates from "YYYY-MM-DD" strings, at midday so no timezone shifts the day.
export const excelDate = (iso: string | null | undefined) => (iso ? new Date(`${iso}T12:00:00`) : null);
