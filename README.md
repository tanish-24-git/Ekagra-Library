# Ekagra Library

Website and admin for Ekagra Library (एकाग्र अभ्यासिका), a study library in Lohegaon, Pune.

- **Public site:** homepage and gallery.
- **Admin:** students, fee status, desk reservations and enquiries from the website form.

Built with Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS v4, Motion and Lenis. Data goes through Drizzle ORM to Neon Postgres.

## Run it

```bash
npm install
cp .env.example .env         # then fill in the values (see below)
npm run dev                  # http://localhost:3000
```

Open the admin at **http://localhost:3000/admin**. In development it opens without a login as long as the three `ADMIN_*` variables are empty. It runs on in-memory sample data until `DATABASE_URL` is set.

## Environment

| Variable | What it does |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Optional override for the site address. By default it's localhost on your computer and the Vercel address (or your domain) when live. |
| `DATABASE_URL` | Neon connection string. Leave empty to use sample data. |
| `NEON_AUTH_BASE_URL` | Neon Auth address (Neon console > your project > Auth). |
| `NEON_AUTH_COOKIE_SECRET` | Random string of at least 32 characters that signs the sign-in cookies. |
| `ADMIN_EMAILS` | Who may sign in to the admin, comma-separated, e.g. `owner@gmail.com,helper@gmail.com`. |
| `ADMIN_PATH` | Optional secret address of the admin, e.g. `desk-7fq2k9` serves it at `/desk-7fq2k9` and makes `/admin` a 404. |
| `DOCUMENTS_KEY` | 64 hex characters that encrypt ID numbers and documents. Keep a backup: without it they can't be read. |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Gmail address and App Password that send fee reminders. Empty means dry runs only. |
| `OWNER_EMAIL` | Where your daily list of due fees goes. Defaults to `GMAIL_USER`. |
| `CRON_SECRET` | Bearer token the daily scheduler sends to `/api/cron/reminders`. |

To generate a cookie secret, a documents key and a secret path:

```bash
node -e "const c=require('crypto');console.log(c.randomBytes(36).toString('base64url'), c.randomBytes(32).toString('hex'), 'desk-'+c.randomBytes(5).toString('hex'))"
```

## Opening the admin

Sign-in uses Neon Auth (Better Auth, hosted by Neon): email and password, or Continue with Google.

| Where | Settings | How to open it |
| --- | --- | --- |
| Your computer (`npm run dev`) on sample data | no `DATABASE_URL`, `ADMIN_EMAILS` empty | `http://localhost:3000/admin`, no login |
| Your computer or the live site | `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` and `ADMIN_EMAILS` set | `/admin` (or `/<ADMIN_PATH>` if set), then sign in |
| Anywhere with a real database but without those settings | | Admin is switched off: every admin URL answers 404 |

The login page has no sign-up. To add an admin, put their email in `ADMIN_EMAILS`, then run `npm run admin:create -- them@gmail.com "Their name"` in the project folder. It prints a temporary password; they sign in and change it under **Email and password** in the admin. Or they can use **Continue with Google** with a listed address.

Under **Email and password**, an admin can change their sign-in email (confirmed with their password) as well as their password. Either change signs out their other devices at once. After an email change the account is recorded in the `admins` table, so it keeps access without editing `ADMIN_EMAILS`, and the old address stops counting even though it's still listed. Update `ADMIN_EMAILS` afterwards anyway to keep the settings tidy.

For the live site:

1. Set the variables above in your host's environment settings and deploy.
2. In the Neon console, under Auth, add the live site's address to the trusted domains.
3. Google sign-in uses Neon's shared Google credentials, which are meant for development. For the live site, add your own Google OAuth client in the Neon console.
4. Create your account with `npm run admin:create` (it talks to Neon Auth directly, so it works from your computer for the live site too), sign in and bookmark the page. Nothing on the public site links to it.

## How the admin stays hidden

When sign-in is set up:

- Every admin page needs a live Neon Auth session (checked against the database on each request, so ended sessions stop at once) for an account whose email is in `ADMIN_EMAILS`, or that is recorded in the `admins` table after changing its email. Other signed-in accounts are treated as signed out.
- With `ADMIN_PATH` set, `/admin` always answers 404 and the admin is served only from the secret path.
- Wrong sign-ins are slowed down and locked out after five tries for 15 minutes; Neon Auth adds its own limits.
- Public sign-up is closed: the login page has none and `/api/auth/sign-up` answers 404. Admin accounts are made with `npm run admin:create`. To close sign-up at Neon too, turn off sign-up under Auth in the Neon console after creating your accounts.
- Admin responses send `X-Robots-Tag: noindex`. `robots.txt` deliberately doesn't mention the admin, because that would advertise it.
- The proxy (`src/proxy.ts`) checks for the session cookie. The admin layout renders nothing until the session and email list check out (`src/lib/admin-guard.ts`), and every page, Server Action and the document route checks again.

Changing `ADMIN_PATH` needs a rebuild, because the admin's links are rendered at build time.

On an office network that inspects HTTPS, Node can't reach Neon (`fetch failed`). `npm run dev` already trusts the operating system's certificates (`src/instrumentation.ts`). For other Node commands, such as `npm run db:push`, start them with `$env:NODE_OPTIONS="--use-system-ca"` in PowerShell.

## Security

- **No data API.** Pages render on the server and every change goes through a Server Action. The only API routes are `/api/auth` (Neon Auth sign-in) and `/api/cron/reminders` (needs `Authorization: Bearer <CRON_SECRET>`). The public enquiry form is a Server Action limited to five enquiries per connection every ten minutes.
- **Database only through Drizzle on the server.** The browser never talks to Neon. Every table has row-level security on with no policies, so Neon's Data API roles see nothing even if a grant is added by mistake. The site isn't using Neon's Data API: switch it off in the Neon console (Data API) to remove that endpoint entirely.
- **ID documents** are encrypted, served only inside the admin to a verified admin, never cached, and sent with a sandbox policy. Uploads must really be JPG, PNG, WebP or PDF (checked from the file's bytes, not its name).
- **Secrets** (database URL, keys, cron token, admin path) exist only on the server; the browser files contain none of them.
- **Headers:** `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, HSTS, a strict `Permissions-Policy`, and no `X-Powered-By`.
- The admin is never open without a login when a real database is connected.

## ID documents

The Add student form takes the Aadhaar and PAN numbers and photos or PDFs of the Aadhaar card, PAN card and driving licence.

- Numbers are checked as you type: Aadhaar groups itself as `1234 5678 9012` and must pass its checksum; PAN switches to capitals.
- Photos are shrunk in the browser before upload (longest side 1800px).
- Numbers and files are encrypted with AES-256-GCM (`src/lib/crypto-box.ts`) before they reach the database. Files are stored in the `student_documents` table.
- The student page shows numbers masked until you choose Show full number. Files are served only to a signed-in admin, never cached.
- The form asks you to confirm the student agreed to share their ID.

## Managing students

Add student takes the name, primary and secondary mobile, email, address, what they study or where they work, the exam, the joining date, seat and fees, and ID details: Aadhaar, PAN and driving licence numbers plus photos of the student and their documents. ID details are all optional; add them later with Edit.

On a student's page:

- **Edit**: details, seat, monthly fee, ID numbers (blank keeps the saved one) and ID documents (a new file replaces the old one).
- **Pause membership**: freezes it. No reminders go out while paused. **Resume membership** moves the end date on by the days it was paused.
- **Mark as left**: keeps their history but takes them off the active list (the Status filter shows them). **Renew** brings them back.
- **Delete**: removes the student, their memberships, payments, reminders and ID documents for good, after a confirmation.
- **Remove** a saved Aadhaar, PAN or licence number, or **Delete this file** for a single document.

The page also shows the time in the library ("1 year 2 months"), the next renewal date and the total paid.

## Excel downloads

**Download Excel** on the Students and Enquiries pages. The files have a bold yellow, frozen header row with filters, real dates and rupee amounts.

- Students: everyone (active, paused, left) with contact details, address, seat, fees, joining and renewal dates, time in the library, total paid, and the full Aadhaar, PAN and licence numbers. Photos and document files are never included. Treat the file as confidential.
- Enquiries: date, name, mobile, area, exam and status.
- Deleted students are gone for good; use Mark as left to keep someone on record.

## Enquiries and spam

Name, mobile, area and exam are required. In the admin, set each enquiry's status (New, Contacted, Joined, Closed) or delete it. The form is protected by a hidden trap field, ignores forms sent within 3 seconds of opening, allows 3 enquiries an hour and 8 a day per connection (stored as a salted hash, not the IP), and doesn't store the same phone number twice in a week.

## Fees and reminders

- Students pay when they join (Add student records the payment and how it was paid). Each membership runs for the months paid.
- A membership is **due** 10 days before it ends (`REMIND_DAYS_BEFORE` in `src/lib/students.ts`).
- The admin's **Fees due** list shows due and overdue students, each with **Send on WhatsApp** (opens WhatsApp with the message typed; you tap Send) and **Renew**.
- **Renew** on the student page records the payment and adds the months. The new period starts when the current one ends, or today if it has already ended.
- Every morning at 9:00 IST the scheduler calls `/api/cron/reminders`: you get one email listing who is due, and each due student with an email address gets their own. Each goes out once per membership (`reminders` table). Without Gmail settings the run is a dry run. **Send email reminders now** in the admin does the same on demand.

Scheduling: `vercel.json` sets this up on Vercel (set `CRON_SECRET` there and Vercel sends it). On any other host, create a free job at cron-job.org for `https://your-site/api/cron/reminders` at 03:30 UTC with the header `Authorization: Bearer <CRON_SECRET>`.

## Deploying to Vercel

1. vercel.com/new → import this repository (Next.js is detected; keep the default build settings).
2. Paste your whole `.env` into Environment Variables → Key (Production). Vercel splits it into variables. The same file works on your computer and live; the site address is worked out automatically.
3. Deploy.
4. In the Neon console → Auth, add the live address to the trusted domains.
5. Your admin password lives in Neon Auth, so it's the same locally and live. `DOCUMENTS_KEY` must stay identical everywhere, or saved ID numbers and documents can't be read.

Daily fee reminders run by themselves (`vercel.json`, 9:00 IST). A step-by-step guide for Gmail, WhatsApp, Google Forms and Vercel is kept outside the repository (`docs/Ekagra-Library-setup-guide.pdf` on the owner's computer).

## Google Forms sync

Two Google Forms (registration and payment) send each response to the site, and the form keeps its own copy as a backup. Off until `INTAKE_SECRET` is set.

1. Generate a secret (`node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`) and set `INTAKE_SECRET` in `.env` and on Vercel.
2. In each form: ⋮ → Apps Script → paste `scripts/google-forms/intake.gs`, set `FORM` (`registration` or `payment`), `SITE` (`https://your-domain/api/intake/google-forms`) and `SECRET`, then add an "On form submit" trigger for `onSubmit`.
3. Responses appear in the admin under **Form submissions**:
   - A **registration** opens Add student already filled in (details, ID numbers, consent), and its uploaded files become the student's documents.
   - A **payment** is matched to a student by mobile number. **Confirm and renew** records the payment on the date paid and adds the months. The screenshot stays with the submission.

The script sends the answers first and then each file on its own; large photos are resized by Google Drive first, so every request stays under Vercel's 4.5 MB limit. Without the right `Authorization: Bearer <INTAKE_SECRET>` header, `/api/intake/google-forms` answers 404. Answers are stored encrypted; question titles are matched loosely (see the top of the script for the titles).

## Automatic WhatsApp reminders

Off until `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_TEMPLATE_NAME` are set (Meta WhatsApp Cloud API; see the setup guide). The template's body takes two variables: `{{1}}` the student's first name and `{{2}}` the end date. Once set, the daily reminder job also sends it to each due student, once per membership. Until then, Send reminders now reports what it would send, and the Send on WhatsApp buttons work as before.

## Database

The schema is in `src/db/schema.ts` (students, memberships, seats, payments, enquiries, student documents, reminders).

```bash
npm run db:push       # create or update tables in Neon from the schema
npm run db:generate   # or generate SQL migrations into drizzle/
npm run db:migrate    # and apply them
npm run db:studio     # browse data
```

## Photos

- **Gallery:** the library's own photos and video. Put new photos in `photos-inbox/` and run `npm run photos:import`. The script resizes them, strips EXIF data (including GPS) and writes `src/content/gallery-photos.json`. Then add a caption for each new file in `src/content/gallery.ts`.
- **Homepage:** CC0 (public domain) stock photos of reading rooms from Wikimedia Commons, listed in `src/content/images.ts`. Use only CC0 or public-domain photos here, because the site no longer has a credits page.

## Search (SEO)

- Titles, descriptions, keywords and the library's address, hours and map pin are in `src/content/site.ts` (`site` and `seo`).
- Structured data (schema.org JSON-LD) is built in `src/lib/structured-data.ts`: Library and WebSite on every page, FAQPage on the homepage, BreadcrumbList and ImageGallery on the gallery.
- `sitemap.xml` lists the pages with their images and video, `robots.txt` points to it, and `/llms.txt` is a plain-text summary for AI assistants.
- Every page has one `<h1>` with the library's name and area, then `<h2>` sections and `<h3>` items.

At launch:

1. Add your domain in Vercel (Settings → Domains). Canonical links, the sitemap and structured data switch to it by themselves.
2. Add the site to Google Search Console and Bing Webmaster Tools, and submit `https://your-site/sitemap.xml`.
3. Claim the Google Maps listing (Google Business Profile). Make its name, address and phone match the site exactly, choose the "Library" category, add photos and ask students for reviews. This matters most for "study library in Lohegaon" searches on Maps.
4. Check the structured data with https://search.google.com/test/rich-results.

## Where things are

```
src/
  app/(site)/        public pages: home, gallery
  app/admin/         admin (served from ADMIN_PATH): login, students, enquiries
  app/api/           auth (Neon Auth sign-in), cron (fee reminders)
  components/        home sections, gallery, admin, shared UI
  content/           site copy (site.ts), stock photos, gallery list
  db/                Drizzle schema and Neon client
  lib/               data access, validation, admin sessions
  proxy.ts           admin hiding and API protection
scripts/import-photos.mjs
```

All visitor-facing text is in `src/content/site.ts`.
