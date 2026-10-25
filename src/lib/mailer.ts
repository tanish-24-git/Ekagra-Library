import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { site } from "@/content/site";

// Sends email through Gmail with an App Password (Google account > Security >
// App passwords, needs 2-Step Verification). Gmail allows about 500 a day.
// Without GMAIL_USER and GMAIL_APP_PASSWORD nothing is sent: callers get
// { sent: false } and can show a dry run instead.

export const mailerReady = () => !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

// Where the owner's daily list goes. Defaults to the sending Gmail address.
export const ownerAddress = () => process.env.OWNER_EMAIL || process.env.GMAIL_USER || "";

let transport: Transporter | undefined;

export async function sendMail(message: { to: string; subject: string; text: string; html: string }) {
  if (!mailerReady()) return { sent: false };
  transport ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transport.sendMail({ from: `"${site.name}" <${process.env.GMAIL_USER}>`, replyTo: process.env.GMAIL_USER, ...message });
  return { sent: true };
}
