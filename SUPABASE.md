# Supabase setup (schnellsicherumzug)

The app’s database schema is already applied to your Supabase project **schnellsicherumzug** (ref: `ixvabvfqrqttjhxjclzd`), and minimal seed data (PricingConfig + AvailabilityRule) is in place so the app and booking/availability APIs work.

## Connect the app to Supabase

1. **Get your connection strings**  
   In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Project Settings** → **Database**:
   - **Session pooler** (port **5432**, host `…pooler.supabase.com`) – for general use.
   - **Direct connection** (port **5432**, host `db.ixvabvfqrqttjhxjclzd.supabase.co`) – use this for the app if you see “Invalid invocation” with the pooler (Turbopack + Prisma adapter).

2. **Set in `.env`**
   ```env
   DATABASE_URL="postgresql://postgres.ixvabvfqrqttjhxjclzd:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?schema=public&sslmode=require"
   ```
   If the booking/availability page shows “Scheduling load failed: Invalid … invocation”, also set the **direct** URL (avoids pooler with Prisma):
   ```env
   DIRECT_URL="postgresql://postgres.ixvabvfqrqttjhxjclzd:[PASSWORD]@db.ixvabvfqrqttjhxjclzd.supabase.co:5432/postgres?schema=public&sslmode=require"
   ```
   The app will use `DIRECT_URL` for Prisma when it points to Supabase.

3. **Optional: full seed (catalog, etc.)**  
   With `DATABASE_URL` pointing at Supabase, run:
   ```bash
   npm run db:seed
   ```
   This loads catalog items and any other seed data. If you skip it, the app still works with the minimal data already applied via Supabase MCP.

4. **Run the app**
   ```bash
   npm run dev
   ```

## Tables in Supabase

- `CatalogItem`, `PricingConfig`, `AvailabilityRule`, `AvailabilityException`
- `Order`, `OrderLine`, `OrderUpload`
- `WhatsAppConversation`
- `_prisma_migrations` (so Prisma treats migrations as applied)

SSL is enabled automatically when `DATABASE_URL` contains `supabase.com` (see `src/server/db/prisma.ts` and `prisma/seed.ts`).
