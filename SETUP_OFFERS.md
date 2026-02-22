# Angebote & Verträge Setup Guide

This guide explains how to set up the complete offer and contract flow for Schnell Sicher Umzug.

## Overview

The system implements:
1. **Premium Offer PDF Generation** - Professional German corporate design
2. **Supabase Storage** - For PDF storage
3. **DocuSign Integration** - Electronic signature
4. **ORS Distance Pricing** - Real distance via OpenRouteService + PLZ cache
5. **Email Flow** - Automated emails at each step
6. **Admin Dashboard** - Manage all offers and contracts

## Prerequisites

- Supabase account
- DocuSign developer account
- SMTP email server (already configured)

## Step 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down:
   - Project URL
   - Anon key
   - Service role key

### 1.2 Configure Environment Variables

Add to your `.env` file:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### 1.3 Create Storage Buckets

Run the setup script:

```bash
npm run setup:storage
```

Or manually create two buckets in Supabase:
- `offers` (public)
- `signed-contracts` (public)

Both should allow PDF files up to 50MB.

## Step 2: DocuSign Setup

### 2.1 Create DocuSign Developer Account

1. Go to [developers.docusign.com](https://developers.docusign.com)
2. Create a free developer account
3. Create a new app in the Admin panel

### 2.2 Generate RSA Key Pair

```bash
# Generate private key
openssl genrsa -out docusign-private.key 2048

# Generate public key
openssl rsa -in docusign-private.key -pubout -out docusign-public.key
```

### 2.3 Configure DocuSign App

1. In DocuSign Admin:
   - Add the public key to your app
   - Enable JWT Grant authentication
   - Add redirect URI: `https://your-domain.com/api/docusign/callback`
   - Note down:
     - Integration Key (Client ID)
     - User ID (GUID)
     - Account ID

### 2.4 Configure Environment Variables

Add to your `.env` file:

```env
DOCUSIGN_INTEGRATION_KEY="your-integration-key"
DOCUSIGN_USER_ID="your-user-id"
DOCUSIGN_ACCOUNT_ID="your-account-id"
DOCUSIGN_PRIVATE_KEY_PATH="./docusign-private.key"
# OR inline:
# DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----"
DOCUSIGN_REDIRECT_URI="https://your-domain.com/api/docusign/callback"
DOCUSIGN_WEBHOOK_SECRET="generate-a-random-secret"
```

Wichtig:
- `DOCUSIGN_PRIVATE_KEY` muss ein echter `PRIVATE KEY` sein (kein `PUBLIC KEY`).
- Bei Inline-Key müssen Zeilenumbrüche als `\n` gespeichert werden.
- In Produktion sollte `DOCUSIGN_WEBHOOK_SECRET` immer gesetzt sein.

## Step 2.6: ORS Distance Setup

Add these variables to `.env`:

```env
ORS_API_KEY="your-ors-api-key"
ORS_BASE_URL="https://api.openrouteservice.org"
PER_KM_PRICE=1.2
MIN_DRIVE_PRICE=25
ORS_CACHE_TTL_DAYS=30
```

Behavior:
- The app uses ORS `driving-car` routes for distance.
- If ORS fails, the server falls back to a Haversine-based approximation and marks the source as `fallback`.
- Distance values are cached by normalized PLZ pairs (`A-B` equals `B-A`) with TTL.

### 2.5 Grant Consent

Run this URL in your browser (replace with your integration key):

```
https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=YOUR_INTEGRATION_KEY&redirect_uri=https://your-domain.com/api/docusign/callback
```

Click "Allow" to grant consent.

## Step 3: Database Migration

Run the Prisma migration:

```bash
npm run db:up
npm run prisma:migrate
```

This creates the `Offer` and `Contract` tables.

## Step 4: Test the Flow

### 4.0 Check Integration Readiness

```bash
curl http://localhost:3000/api/integrations/health
```

Deep check (JWT + Account Resolution):

```bash
curl "http://localhost:3000/api/integrations/health?deep=1"
```

CLI diagnostic:

```bash
npm run docusign:diag
```

Verify:
- `integrations.ors.ready === true`
- `integrations.smtp.ready === true`
- `integrations.docusign.ready === true` (or expected `false` in local/dev)

### 4.1 Create a Test Order

1. Go to the calculator: `/preise`
2. Fill out the form and submit
3. This creates an order in the database

### 4.2 Generate Offer

Call the API to create an offer:

```bash
curl -X POST http://localhost:3000/api/offers/create \
  -H "Content-Type: application/json" \
  -d '{"orderId": "YOUR_ORDER_ID"}'
```

This will:
- Create an offer record
- Generate a premium PDF
- Upload to Supabase
- Send email to customer

### 4.3 Accept Offer

1. Customer receives email with link
2. Customer clicks "Angebot annehmen"
3. System generates contract PDF
4. Sends to DocuSign for signature (Remote Signing)
5. Customer signs electronically

### 4.4 Webhook Processing

When customer signs:
1. DocuSign sends webhook to `/api/docusign/webhook`
2. System downloads signed PDF
3. Uploads to Supabase
4. Sends email to customer and admin

## Step 5: Admin Dashboard

Access the admin dashboard:

```
http://localhost:3000/admin/offers
```

Features:
- View all offers
- Filter by status
- Search by customer
- Download PDFs
- View contract status
- Resend emails

## Email Templates

Three email templates are implemented:

### 1. Offer Email
Sent when offer is created:
- Professional German text
- PDF attachment
- Link to view online
- Valid until date

### 2. Signing Email
Sent when offer is accepted:
- DocuSign signing link
- Instructions
- Legal notice

### 3. Signed Contract Email
Sent after signing:
- Signed PDF attachment
- Confirmation
- Next steps

## PDF Designs

### Offer PDF
- Company letterhead
- Customer data
- Move details
- Services list
- Price breakdown (net, VAT, gross)
- Valid until date
- Terms
- Bank details in footer

### Contract PDF
- Full legal contract
- All parties
- Terms and conditions
- Signature fields
- Professional layout

## Customization

### Company Data

All company data is hardcoded in the PDF generators:

```typescript
// src/server/pdf/generate-offer.ts
// src/server/pdf/generate-contract.ts
```

Update these files to change:
- Company name
- Address
- Tax ID
- Bank details
- Logo

### Email Templates

Email templates are in:

```typescript
// src/server/email/send-offer-email.ts
// src/server/email/send-signing-email.ts
// src/server/email/send-signed-contract-email.ts
```

### Offer Validity

Default: 7 days

Change in `.env`:

```env
OFFER_VALIDITY_DAYS=14
```

## Troubleshooting

### DocuSign Authentication Fails

1. Check if a PUBLIC key was accidentally used instead of PRIVATE key.
2. For inline key, verify `\n` formatting is correct.
3. Verify Integration Key, User ID and Account ID.
4. Ensure consent was granted (`consent_required` case).
5. Run `npm run docusign:diag` and `/api/integrations/health?deep=1`.

### PDF Upload Fails

1. Check Supabase credentials
2. Verify bucket exists and is public
3. Check file size limits
4. Review storage policies

### Webhook Not Received

1. Verify webhook URL is publicly accessible
2. Check DocuSign webhook configuration
3. Review webhook logs in DocuSign
4. Test with ngrok for local development

### Email Not Sent

1. Check SMTP credentials
2. Verify email addresses
3. Check spam folder
4. Review email logs

## Production Deployment

### 1. Environment Variables

Set all production environment variables:
- Use production Supabase project
- Use production DocuSign account
- Use production domain for webhooks

### 2. SSL Certificate

Ensure your domain has a valid SSL certificate for:
- Webhook endpoint
- Offer pages
- DocuSign redirect

### 3. Database

Run migrations on production database:

```bash
npm run prisma:deploy
```

### 4. Storage Buckets

Create storage buckets in production Supabase:

```bash
npm run setup:storage
```

### 5. DocuSign Production

1. Move app to production in DocuSign
2. Update environment variables
3. Grant consent again for production

## API Endpoints

### Create Offer
```
POST /api/offers/create
Body: { orderId: string }
```

### Accept Offer
```
POST /api/offers/[offerId]/accept
```

### DocuSign Webhook
```
POST /api/docusign/webhook
```

### View Offer
```
GET /offer/[token]
```

### Admin Dashboard
```
GET /admin/offers
```

## Security

- Offers use secure random tokens (32 chars)
- Tokens expire after validity period
- Admin routes protected by session
- DocuSign uses JWT authentication
- Webhook signature verification recommended
- Row Level Security on Supabase (optional)

## Support

For issues or questions:
- Email: kontakt@schnellsicherumzug.de
- Phone: +49 172 9573681
