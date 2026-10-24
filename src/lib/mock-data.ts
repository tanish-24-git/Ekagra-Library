import type { ExamTarget } from "@/db/schema";
import type { EnquiryRecord, StudentRecord } from "./students";

// Seed rows for running the admin without a database. Dates are built
// relative to "today" so fee statuses always look realistic.

type Seed = [name: string, phone: string, exam: ExamTarget, seat: string | null, endsInDays: number, fee: number];

const seeds: Seed[] = [
  ["Pratiksha Jadhav", "9822011450", "mpsc_rajyaseva", "A-04", 18, 1200],
  ["Omkar Shinde", "9765302214", "mpsc_combined", null, 3, 900],
  ["Snehal Patil", "9890045521", "upsc_cse", "A-07", 26, 1200],
  ["Akash Pawar", "9028876610", "police_bharti", null, -4, 900],
  ["Rutuja Kulkarni", "9545120987", "neet", "B-02", 12, 1200],
  ["Sagar More", "9767789012", "banking", null, 6, 900],
  ["Vaishnavi Deshmukh", "8605512330", "jee", "B-05", 21, 1200],
  ["Nikhil Gaikwad", "9673345120", "ssc", null, -1, 900],
  ["Aditi Joshi", "9921156784", "mpsc_rajyaseva", "A-01", 15, 1200],
  ["Rohan Bhosale", "9146620031", "upsc_cse", "A-11", 2, 1200],
  ["Komal Salunkhe", "8888123409", "neet", null, 29, 900],
  ["Tejas Chavan", "9370012876", "mpsc_combined", "B-09", 9, 1200],
];

const enquirySeeds: [string, string, string | null, string | null, number][] = [
  ["Mayur Kale", "9823344556", "MPSC Rajyaseva", "My room is too noisy to study in. I want a desk near a window.", 0],
  ["Shruti Ghorpade", "7709123456", "NEET 2027", null, 1],
  ["Ganesh Thorat", "9011223344", null, "Friends recommended it. I’d like to visit first.", 3],
];

const isoDay = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

export function buildMockStudents(): StudentRecord[] {
  return seeds.map(([fullName, phone, examTarget, seatNumber, endsInDays, feeInr], i) => ({
    id: `mock-${i + 1}`,
    fullName,
    phone,
    examTarget,
    status: endsInDays < -7 ? "expired" : "active",
    joinedOn: isoDay(endsInDays - 30 * ((i % 4) + 1)),
    seating: seatNumber ? "reserved" : "open",
    seatNumber,
    endsOn: isoDay(endsInDays),
    feeInr,
  }));
}

export function buildMockEnquiries(): EnquiryRecord[] {
  return enquirySeeds.map(([name, phone, preparingFor, reason, daysAgo], i) => ({
    id: `mock-enq-${i + 1}`,
    name,
    phone,
    preparingFor,
    reason,
    status: "new",
    createdAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
  }));
}
