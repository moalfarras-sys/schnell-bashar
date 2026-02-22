# Quick Start Guide - Schnell Sicher Umzug

## 🚀 Get Started in 5 Minutes

This guide will get you up and running quickly with the offer and contract system.

---

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database running (or Docker)
- Supabase account (free tier is fine)
- DocuSign developer account (free)

---

## Step 1: Clone & Install (2 minutes)

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate
```

---

## Step 2: Environment Setup (3 minutes)

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Minimum Required Variables

For local development, you need at least:

```env
# Base
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# Database (use existing or Docker)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/schnell_sicher_umzug?schema=public"

# SMTP (use your existing)
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT="587"
SMTP_USER="kontakt@schnellsicherumzug.de"
SMTP_PASS="your-password"
SMTP_FROM="Schnell Sicher Umzug <kontakt@schnellsicherumzug.de>"

# Supabase (get from supabase.com)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# DocuSign (get from developers.docusign.com)
DOCUSIGN_INTEGRATION_KEY="your-integration-key"
DOCUSIGN_USER_ID="your-user-id"
DOCUSIGN_ACCOUNT_ID="your-account-id"
DOCUSIGN_PRIVATE_KEY_PATH="./docusign-private.key"
```

---

## Step 3: Supabase Setup (5 minutes)

### 3.1 Create Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose a name and password
4. Wait for project to be ready (~2 minutes)

### 3.2 Get Credentials

1. Go to Project Settings → API
2. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

### 3.3 Create Storage Buckets

Run the setup script:

```bash
npm run setup:storage
```

Or manually:
1. Go to Storage in Supabase dashboard
2. Create bucket: `offers` (public)
3. Create bucket: `signed-contracts` (public)

---

## Step 4: DocuSign Setup (10 minutes)

### 4.1 Create Developer Account

1. Go to [developers.docusign.com](https://developers.docusign.com)
2. Sign up for free developer account
3. Verify email

### 4.2 Create App

1. Go to Admin → Apps and Keys
2. Click "Add App and Integration Key"
3. Name it "Schnell Sicher Umzug"
4. Save the Integration Key → `DOCUSIGN_INTEGRATION_KEY`

### 4.3 Generate RSA Keys

```bash
# Generate private key
openssl genrsa -out docusign-private.key 2048

# Generate public key
openssl rsa -in docusign-private.key -pubout -out docusign-public.key
```

### 4.4 Add Public Key to DocuSign

1. In your app settings, click "Add RSA Keypair"
2. Copy contents of `docusign-public.key`
3. Paste and save

### 4.5 Get User ID and Account ID

1. User ID: In Admin, click your name → User ID (GUID)
2. Account ID: In Admin → API and Keys → Account ID

### 4.6 Grant Consent

Open this URL in browser (replace YOUR_INTEGRATION_KEY):

```
https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=YOUR_INTEGRATION_KEY&redirect_uri=http://localhost:3000/api/docusign/callback
```

Click "Allow" to grant consent.

---

## Step 5: Database Migration (1 minute)

```bash
# Start database (if using Docker)
npm run db:up

# Run migration
npm run prisma:migrate

# Seed database (optional)
npm run db:seed
```

---

## Step 6: Start Development Server (1 minute)

```bash
npm run dev
```

Visit: http://localhost:3000

---

## 🧪 Test the Complete Flow

### Test 1: Create Order

1. Go to http://localhost:3000/preise
2. Fill out the calculator
3. Submit the form
4. Note the order ID from the confirmation

### Test 2: Create Offer

Open a terminal and run:

```bash
curl -X POST http://localhost:3000/api/offers/create \
  -H "Content-Type: application/json" \
  -d '{"orderId": "YOUR_ORDER_ID_HERE"}'
```

You should get a response with:
- `offerId`
- `token`
- `offerLink`

Check your email - you should receive the offer email with PDF!

### Test 3: View Offer

1. Click the link in the email OR
2. Go to the `offerLink` from the API response
3. You should see the offer page with all details

### Test 4: Accept Offer

1. Click "Angebot annehmen" button
2. You'll be redirected to DocuSign
3. Sign the contract
4. After signing, you'll receive confirmation email

### Test 5: Check Admin Dashboard

1. Login to admin: http://localhost:3000/admin/login
2. Go to: http://localhost:3000/admin/offers
3. You should see your offer with all details
4. Download PDFs
5. View status timeline

---

## 🎯 Quick Reference

### Important URLs

- **Home**: http://localhost:3000
- **Calculator**: http://localhost:3000/preise
- **Admin Login**: http://localhost:3000/admin/login
- **Admin Offers**: http://localhost:3000/admin/offers
- **Offer View**: http://localhost:3000/offer/[token]

### API Endpoints

- **Create Offer**: `POST /api/offers/create`
- **Accept Offer**: `POST /api/offers/[offerId]/accept`
- **DocuSign Webhook**: `POST /api/docusign/webhook`

### NPM Scripts

```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run setup:storage    # Setup Supabase storage
npm run db:up            # Start Docker database
npm run db:seed          # Seed database
```

---

## 🐛 Troubleshooting

### "Can't reach database server"

Start the database:
```bash
npm run db:up
```

### "Supabase credentials invalid"

1. Check your Supabase project is active
2. Verify all three credentials are correct
3. Make sure you copied the full keys (they're long!)

### "DocuSign authentication failed"

1. Check private key path is correct
2. Verify integration key and user ID
3. Make sure you granted consent
4. Try regenerating the RSA keys

### "Email not sent"

1. Check SMTP credentials
2. Verify email address is correct
3. Check spam folder
4. Test SMTP connection separately

### "PDF upload failed"

1. Check Supabase storage buckets exist
2. Verify they're set to public
3. Check service role key has correct permissions

---

## 📚 Next Steps

1. **Customize PDFs**: Edit `src/server/pdf/generate-offer.ts` and `generate-contract.ts`
2. **Customize Emails**: Edit files in `src/server/email/`
3. **Add Logo**: Place logo in `public/media/brand/`
4. **Configure Pricing**: Adjust in admin dashboard
5. **Setup Production**: Follow `SETUP_OFFERS.md` for production deployment

---

## 📖 Full Documentation

- **Setup Guide**: `SETUP_OFFERS.md`
- **Implementation Summary**: `IMPLEMENTATION_SUMMARY.md`
- **API Documentation**: See individual route files

---

## 🆘 Need Help?

- **Email**: kontakt@schnellsicherumzug.de
- **Phone**: +49 172 9573681

---

## ✅ Checklist

Before going live, make sure:

- [ ] All environment variables are set
- [ ] Supabase storage buckets created
- [ ] DocuSign consent granted
- [ ] Database migrated
- [ ] SMTP working
- [ ] Test order → offer → sign flow works
- [ ] Admin dashboard accessible
- [ ] PDFs look correct
- [ ] Emails received
- [ ] Dark/Light mode works

---

**You're all set! 🎉**

Start creating offers and contracts for your customers!
