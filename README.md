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
| `ADMIN_PATH` | Secret address of the admin, e.g. `desk-7fq2k9` serves it at `/desk-7fq2k9`. |
| `ADMIN_PASSWORD` | Admin password. |
| `ADMIN_SESSION_SECRET` | Long random string used to sign admin sessions. |

To generate the three admin values:

```bash
node -e "const c=require('crypto');console.log('desk-'+c.randomBytes(5).toString('hex'), c.randomBytes(12).toString('base64url'), c.randomBytes(32).toString('hex'))"
```

## Opening the admin

| Where | Admin settings | How to open it |
| --- | --- | --- |
| Your computer (`npm run dev`) | empty | `http://localhost:3000/admin`, no login |
| Your computer or the live site | all three set | `https://your-site/<ADMIN_PATH>`, then sign in with `ADMIN_PASSWORD` |
| Live site (`npm run build && npm start`, or any host) | empty | Admin is switched off: every admin URL answers 404 |

For the live site: set the three `ADMIN_*` variables in your host's environment settings, deploy, then open `https://your-site/<ADMIN_PATH>` and bookmark it. Nothing on the public site links to it.

## How the admin stays hidden

When the admin settings are present:

- `/admin` always answers 404, signed in or not. The admin is served only from `ADMIN_PATH`.
- Every admin page needs a login. Sessions are HMAC-signed, httpOnly, SameSite=Strict cookies that last 12 hours.
- Wrong passwords are slowed down and locked out after five tries for 15 minutes.
- Admin API routes (`/api/students`, `/api/seats`, `GET /api/enquiries`) answer 404 without a session.
- Admin responses send `X-Robots-Tag: noindex`. `robots.txt` deliberately doesn't mention the admin, because that would advertise it.
- The proxy (`src/proxy.ts`) does these checks, and each admin page, action and API handler repeats them.

Changing `ADMIN_PATH` needs a rebuild, because the admin's links are rendered at build time.

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
  app/api/           students, seats, enquiries, health
  components/        home sections, gallery, admin, shared UI
  content/           site copy (site.ts), stock photos, gallery list
  db/                Drizzle schema and Neon client
  lib/               data access, validation, admin sessions
  proxy.ts           admin hiding and API protection
scripts/import-photos.mjs
```

All visitor-facing text is in `src/content/site.ts`.
