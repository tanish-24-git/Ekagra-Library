// Creates an admin account in Neon Auth with a generated password.
// The login page has no sign-up, so new admins are added from here:
//
//   npm run admin:create -- you@gmail.com "Your name"
//
// The email must also be in ADMIN_EMAILS (.env.local and the live host) to
// open the admin. Change the password after the first sign-in (Change
// password in the admin).
import { randomBytes } from "node:crypto";

const [email, name] = process.argv.slice(2);
if (!email || !email.includes("@")) {
  console.error('Usage: npm run admin:create -- you@gmail.com "Your name"');
  process.exit(1);
}

const base = (process.env.NEON_AUTH_BASE_URL ?? "").replace(/\/$/, "");
if (!base) {
  console.error("NEON_AUTH_BASE_URL isn't set in .env.local.");
  process.exit(1);
}

const allowed = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
if (!allowed.includes(email.toLowerCase())) {
  console.warn(`Note: ${email} isn't in ADMIN_EMAILS yet. Add it there, or this account can't open the admin.`);
}

const password = randomBytes(12).toString("base64url");
const res = await fetch(`${base}/sign-up/email`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000" },
  body: JSON.stringify({ email, password, name: name || email.split("@")[0] }),
});
const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`Couldn't create the account (${res.status}): ${body.message ?? body.code ?? "unknown error"}`);
  process.exit(1);
}

console.log(`Admin account created for ${email}.`);
console.log(`Temporary password: ${password}`);
console.log("Sign in with it, then change it under Change password in the admin.");
