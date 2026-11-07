# ReidBiz

Sales, inventory and rental management for small shops. Built for a Malaysian cloud game
rental business, but the normal buy/sell flow works for any product.

## Features

- Dashboard: today/7-day/all-time revenue, stock summary, 7-day chart, top products, recent sales.
- Inventory: products with cost and selling price, search, stock status filters.
- Sales: record a sale and deduct stock, full sales ledger.
- Rentals: mark a product as rentable with its own prices for 3 hours / day / week / month,
  one slot per account, start date picker for backdating, promo price override, and account
  expiry tracking with warnings.
- Reports: printable monthly income receipt (rentals + sales + promo discounts).
- Admin: platform overview and merchant account management.

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Prisma 6 with PostgreSQL (Supabase)
- Bootstrap 5 plus the custom `public/css/smartbiz.css` design system

There is no login: the app runs as a single default account (`owner`) created automatically.

## Local setup

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL and DIRECT_URL
npm run dev
```

Environment variables:

- `DATABASE_URL`: Supabase pooled connection (port 6543, `?pgbouncer=true&connection_limit=1`)
- `DIRECT_URL`: Supabase direct connection (port 5432)
- `TZ`: `Asia/Kuala_Lumpur` for Malaysia-local dates

## Database

Create the tables with Prisma:

```bash
npm run db:push
```

If your network blocks port 5432/6543, run the SQL files in the Supabase SQL Editor instead:

- `prisma/supabase_setup.sql` (fresh install)
- `prisma/supabase_rental.sql` (adds rental tables and columns, safe to re-run)

## Deploy (Vercel)

1. Push the repo to GitHub.
2. Import it on Vercel (framework preset: Next.js).
3. Add environment variables `DATABASE_URL`, `DIRECT_URL`, `TZ` for Production and Preview.
4. Deploy.

## Login gate (optional)

The app has no accounts: every visitor shares one workspace. To stop strangers
from opening the ledger, set `APP_PASSWORD` in Vercel (and locally in `.env`).
Once set, the middleware sends every request to `/login` until the correct
password is entered, and a signed cookie keeps that device signed in for 30 days.
Leave `APP_PASSWORD` unset to keep the current open behaviour. `AUTH_SECRET` is
optional; set a long random string so existing sessions survive a password change.

## Project structure

```
app/            routes (landing, dashboard, products, rentals, reports, admin)
components/     shared client components (nav, forms, chart, print button)
lib/            prisma client, auth/user, formatting, rental logic, notifications
prisma/         schema and Supabase SQL
public/         design system CSS and favicon
```
