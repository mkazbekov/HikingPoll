# TrailSync — Group Hiking Availability Poll

A friendly, mobile-first web app for planning a group hike. Inspired by LettuceMeet but
built for the trail: everyone marks when they're free with click-and-drag, votes on a
destination, picks a meeting point, and sorts out rides — and a live heatmap reveals the
most popular departure times.

Suggested destination out of the box: **Mont Saint-Hilaire**.

## Features

- **Availability in 15-minute intervals** — drag across the week grid to paint your free
  times (drag again to erase). Single tap also works on mobile.
- **Week & month views** — the month view shows a green-intensity heatmap per day; tap a
  day to jump to that week.
- **Public departure-time heatmap** — the busiest slots are badged “Most popular departure
  times,” with exact counts (colorblind-safe: intensity *and* numbers).
- **Name-based responses** — enter your name to respond; enter the **same name** again to
  edit your response (no accounts, no passwords).
- **Destinations** — a suggested pick plus anyone can propose alternatives and vote.
- **Logistics** — pickup/meeting points and transportation (car / public transit / needs a
  ride). Drivers say how many passenger seats they can offer; a rides summary tallies seats
  vs. people who need one.
- **Admin dashboard** (`/admin`) — password-protected. Edit or delete responses, manage
  destinations and pickup points, and change event settings (title, dates, hours).
- **Persistent database** and **one-click Vercel deploy**. Light + dark mode, keyboard
  accessible, respects reduced motion.

## Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** with a semantic light/dark token palette
- **Postgres**, via two interchangeable drivers that speak identical SQL:
  - **Local dev:** [PGlite](https://pglite.dev) — an embedded Postgres saved to `./.pglite`.
    **No database install or setup needed.**
  - **Production:** [Neon](https://neon.tech) serverless Postgres (used automatically when
    `DATABASE_URL` is set).

## Run it locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. That's it — the app creates and seeds a local database
(`./.pglite`) on first run. The admin dashboard is at `/admin`; the local dev password is
`hike-admin` (override with `ADMIN_PASSWORD`).

## Deploy to Vercel

1. **Push this repo to GitHub** (already wired to `github.com/mkazbekov/HikingPoll`).
2. On [vercel.com](https://vercel.com), **Add New → Project** and import the repo.
3. **Add a database:** in the project, go to **Storage → Create Database → Neon** (Postgres).
   Vercel connects it and sets the `DATABASE_URL` environment variable for you.
4. **Set your admin password:** Project **Settings → Environment Variables** →
   add `ADMIN_PASSWORD` = *(a private password of your choice)*.
5. **Deploy.** The database schema and the seed data (event + Mont Saint-Hilaire + pickup
   points) are created automatically on first request.

> Changing settings later? Open `/admin`, sign in with your `ADMIN_PASSWORD`, and edit the
> trip title, date window, destinations, pickup points, or any response.

## Environment variables

| Variable         | Required            | Purpose                                                                 |
| ---------------- | ------------------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`   | Production (Vercel) | Neon Postgres connection string. If unset, the app uses PGlite locally. |
| `ADMIN_PASSWORD` | Recommended         | Password for the `/admin` dashboard. Defaults to `hike-admin` if unset. |

See `.env.example`.

## Project layout

```
app/
  page.tsx            Main poll page  → components/PollApp.tsx
  admin/page.tsx      Admin dashboard → components/AdminDashboard.tsx
  api/                Route handlers (event, responses, destinations, admin/*)
components/           UI: WeekGrid (drag-select), MonthGrid, Heatmap, LogisticsForm, …
lib/
  db.ts               Dual-backend Postgres access + schema + seed
  data.ts             Typed queries / mutations
  auth.ts             Admin cookie auth
  slots.ts, heat.ts   Slot/date helpers and heatmap color ramp
```

## How “edit by name” works

Responses are keyed by a normalized, case-insensitive name. Submitting again with the same
name updates that response in place (availability is replaced, not duplicated). This is
surfaced in the UI with the hint *“enter the same name next time to edit your response.”*
