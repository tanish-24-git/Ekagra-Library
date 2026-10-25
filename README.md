# Ekagra Library

Website and admin for Ekagra Library (एकाग्र अभ्यासिका), a study library in Lohegaon, Pune.

- **Public site:** homepage and gallery.
- **Admin:** students, fee status, desk reservations and enquiries from the website form.

Built with Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS v4, Motion and Lenis. Data goes through Drizzle ORM to Neon Postgres.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev                  # http://localhost:3000
```

Open the admin at **http://localhost:3000/admin**. In development it opens without a login as long as the three `ADMIN_*` variables are empty. It runs on in-memory sample data until `DATABASE_URL` is set.

## Environment

| Variable | What it does |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public URL, used for social previews, `robots.txt` and the sitemap. |
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

First time: open the admin's login page, choose **Create your admin account**, and use an address from `ADMIN_EMAILS`. Or choose **Continue with Google** with that address. Accounts can only be created from this page and only for listed addresses.

For the live site:

1. Set the variables above in your host's environment settings and deploy.
2. In the Neon console, under Auth, add the live site's address to the trusted domains.
3. Google sign-in uses Neon's shared Google credentials, which are meant for development. For the live site, add your own Google OAuth client in the Neon console.
4. Open the admin, create your account and bookmark the page. Nothing on the public site links to it.

## How the admin stays hidden

When sign-in is set up:

- Every admin page needs a Neon Auth session whose email is in `ADMIN_EMAILS`. Signed-in accounts that aren't on the list are treated as signed out.
- With `ADMIN_PATH` set, `/admin` always answers 404 and the admin is served only from the secret path.
- Wrong sign-ins are slowed down and locked out after five tries for 15 minutes; Neon Auth adds its own limits.
- Public sign-up is closed: `/api/auth/sign-up` answers 404.
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

## Fees and reminders

- Students pay when they join (Add student records the payment and how it was paid). Each membership runs for the months paid.
- A membership is **due** 10 days before it ends (`REMIND_DAYS_BEFORE` in `src/lib/students.ts`).
- The admin's **Fees due** list shows due and overdue students, each with **Send on WhatsApp** (opens WhatsApp with the message typed; you tap Send) and **Renew**.
- **Renew** on the student page records the payment and adds the months. The new period starts when the current one ends, or today if it has already ended.
- Every morning at 9:00 IST the scheduler calls `/api/cron/reminders`: you get one email listing who is due, and each due student with an email address gets their own. Each goes out once per membership (`reminders` table). Without Gmail settings the run is a dry run. **Send email reminders now** in the admin does the same on demand.

Scheduling: `vercel.json` sets this up on Vercel (set `CRON_SECRET` there and Vercel sends it). On any other host, create a free job at cron-job.org for `https://your-site/api/cron/reminders` at 03:30 UTC with the header `Authorization: Bearer <CRON_SECRET>`.

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

1. Set `NEXT_PUBLIC_SITE_URL` to the real domain so canonical links, the sitemap and structured data use it.
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
