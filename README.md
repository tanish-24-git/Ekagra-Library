# Ekagra Library

Website and admin for Ekagra Library (एकाग्र अभ्यासिका), a study library in Yerawada, Pune.

- **Public site:** homepage, gallery, photo credits.
- **Admin:** students, fee status, desk reservations, call-back requests. It lives at a secret path behind a password.

Built with Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS v4, Motion and Lenis. Data goes through Drizzle ORM to Neon Postgres.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev                  # http://localhost:3000
```

The admin runs on in-memory sample data until `DATABASE_URL` is set.

## Environment

| Variable | What it does |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public URL, used for social previews, `robots.txt` and the sitemap. |
| `DATABASE_URL` | Neon connection string. Leave empty to use sample data. |
| `ADMIN_PATH` | Secret address of the admin, e.g. `desk-7fq2k9` serves it at `/desk-7fq2k9`. |
| `ADMIN_PASSWORD` | Admin password. |
| `ADMIN_SESSION_SECRET` | Long random string used to sign admin sessions. |

To generate the three admin values:

```bash
node -e "const c=require('crypto');console.log('desk-'+c.randomBytes(5).toString('hex'), c.randomBytes(12).toString('base64url'), c.randomBytes(32).toString('hex'))"
```

## How the admin stays hidden

- `/admin` always answers 404, signed in or not. The admin is served only from `ADMIN_PATH`.
- Every admin page needs a login. Sessions are HMAC-signed, httpOnly, SameSite=Strict cookies that last 12 hours.
- Wrong passwords are slowed down and locked out after five tries for 15 minutes.
- Admin API routes (`/api/students`, `/api/seats`, `GET /api/enquiries`) answer 404 without a session.
- Admin responses send `X-Robots-Tag: noindex`. `robots.txt` deliberately doesn't mention the admin, because that would advertise it.
- The proxy (`src/proxy.ts`) does these checks, and each admin page, action and API handler repeats them.

Changing `ADMIN_PATH` needs a rebuild, because the admin's links are rendered at build time. If any of the three admin variables is missing, the admin is switched off.

## Database

The schema is in `src/db/schema.ts` (students, memberships, seats, payments, enquiries).

```bash
npm run db:push       # create or update tables in Neon from the schema
npm run db:generate   # or generate SQL migrations into drizzle/
npm run db:migrate    # and apply them
npm run db:studio     # browse data
```

## Photos

- **Gallery:** the library's own photos and video. Put new photos in `photos-inbox/` and run `npm run photos:import`. The script resizes them, strips EXIF data (including GPS) and writes `src/content/gallery-photos.json`. Then add a caption for each new file in `src/content/gallery.ts`.
- **Homepage:** stock photos of other reading rooms from Wikimedia Commons, credited on `/credits` (`src/content/images.ts`).

## Where things are

```
src/
  app/(site)/        public pages: home, gallery, credits
  app/admin/         admin (served from ADMIN_PATH): login, students, enquiries
  app/api/           students, seats, enquiries, health
  components/        home sections, gallery, admin, shared UI
  content/           site copy (site.ts), stock photos, gallery list
  db/                Drizzle schema and Neon client
  lib/               data access, validation, admin sessions
  proxy.ts           admin hiding and API protection
scripts/import-photos.mjs
```

All visitor-facing text is in `src/content/site.ts`.
