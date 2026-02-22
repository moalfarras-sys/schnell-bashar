# Schnell Sicher Umzug - Offer & Contract System

> Premium end-to-end offer and contract management system with electronic signatures

---

## 🎯 What This System Does

This is a complete, production-ready system that automates the entire offer-to-contract workflow for a moving company:

1. **Customer fills out calculator** → System creates order
2. **System generates premium PDF offer** → Sends to customer via email
3. **Customer views offer online** → Clicks "Accept"
4. **System generates contract** → Sends to DocuSign for e-signature
5. **Customer signs electronically** → System stores signed contract
6. **Both parties receive signed PDF** → Ready for moving day

---

## ✨ Key Features

### 🎨 Premium Design
- German corporate design
- Light-only premium theme (ivory/champagne + deep navy accents)
- Professional typography (Inter & Manrope)
- Smooth animations
- Fully responsive
- SEO optimized

### 📄 PDF Generation
- Premium white paper style offers
- Professional contract documents
- Company letterhead with all legal details
- Dynamic customer data
- Price breakdowns
- Bank details

### 📧 Automated Emails
- Professional German templates
- Offer notification
- Signing request
- Signed contract confirmation
- PDF attachments

### ✍️ Electronic Signatures
- DocuSign integration
- Legally binding e-signatures
- Audit trail
- Automated workflow

### 🗄️ Storage & Database
- Supabase for PDF storage
- PostgreSQL database
- Secure token system
- Expiry management

### 👨‍💼 Admin Dashboard
- View all offers
- Track contract status
- Download PDFs
- Search & filter
- Status timeline

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your credentials

# 3. Setup Supabase storage
npm run setup:storage

# 4. Run database migration
npm run db:up
npm run prisma:migrate

# 5. Start development server
npm run dev
```

**📖 Full setup guide:** [QUICKSTART.md](QUICKSTART.md)

---

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get started in 5 minutes
- **[SETUP_OFFERS.md](SETUP_OFFERS.md)** - Complete setup guide
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Technical details
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide

---

## 🏗️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Storage**: Supabase Storage
- **PDF Generation**: PDFKit
- **E-Signature**: DocuSign eSignature API
- **Email**: Nodemailer (SMTP)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Authentication**: Custom admin session (JWT)

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── offers/          # Offer creation & acceptance
│   │   └── docusign/        # DocuSign webhook
│   ├── offer/[token]/       # Customer offer view
│   └── admin/offers/        # Admin dashboard
├── components/
│   ├── theme-provider.tsx   # Light theme enforcement
│   └── site-header.tsx      # Header / navigation
├── lib/
│   ├── supabase.ts          # Supabase client
│   └── docusign.ts          # DocuSign client
└── server/
    ├── pdf/                 # PDF generators
    ├── email/               # Email templates
    └── distance/            # ORS distance + PLZ cache
```

---

## 🔑 Environment Variables

Required for production:

```env
# Base
NEXT_PUBLIC_BASE_URL="https://your-domain.com"

# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# SMTP
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT="587"
SMTP_USER="kontakt@schnellsicherumzug.de"
SMTP_PASS="your-password"

# ORS distance + drive pricing
ORS_API_KEY="your-ors-api-key"
ORS_BASE_URL="https://api.openrouteservice.org"
PER_KM_PRICE=1.2
MIN_DRIVE_PRICE=25
ORS_CACHE_TTL_DAYS=30

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# DocuSign
DOCUSIGN_INTEGRATION_KEY="your-integration-key"
DOCUSIGN_USER_ID="your-user-id"
DOCUSIGN_ACCOUNT_ID="your-account-id"
DOCUSIGN_PRIVATE_KEY_PATH="./docusign-private.key"
```

**📋 Full list:** [.env.example](.env.example)

---

## 🧪 Testing

### Test the Complete Flow

1. **Create Order**
   ```bash
   # Go to http://localhost:3000/preise
   # Fill out calculator and submit
   ```

2. **Generate Offer**
   ```bash
   curl -X POST http://localhost:3000/api/offers/create \
     -H "Content-Type: application/json" \
     -d '{"orderId": "YOUR_ORDER_ID"}'
   ```

3. **View Offer**
   ```bash
   # Check email for offer link
   # Or visit: http://localhost:3000/offer/[token]
   ```

4. **Accept & Sign**
   ```bash
   # Click "Angebot annehmen"
   # Sign in DocuSign
   # Receive signed contract via email
   ```

5. **Check Admin Dashboard**
   ```bash
   # Visit: http://localhost:3000/admin/offers
   ```

---

## 📊 API Endpoints

### Create Offer
```http
POST /api/offers/create
Content-Type: application/json

{
  "orderId": "clx..."
}
```

### Accept Offer
```http
POST /api/offers/[offerId]/accept
```

### Distance Route Quote
```http
POST /api/distance/route
```

### Integrations Health
```http
GET /api/integrations/health
```

Returns readiness for `ORS`, `SMTP`, and `DocuSign` without exposing secrets.
Use this endpoint after deployment to verify operational status.

### DocuSign Webhook
```http
POST /api/docusign/webhook
Content-Type: application/json

{
  "event": "envelope-completed",
  "envelopeId": "...",
  ...
}
```

---

## 🔒 Security

- ✅ Secure random tokens (32 characters)
- ✅ Token expiry (7 days, configurable)
- ✅ Admin authentication (JWT)
- ✅ DocuSign JWT authentication
- ✅ HTTPS required for production
- ✅ Environment variables for secrets
- ✅ Webhook signature verification (recommended)

---

## 🌍 Internationalization

Currently supports:
- **German** (primary language)

Email templates and PDFs are in German with proper formatting:
- Formal address (Sie)
- German date format (dd.MM.yyyy)
- Euro currency (€)
- German legal terms

---

## 📈 Features Roadmap

### Implemented ✅
- [x] Offer PDF generation
- [x] Contract PDF generation
- [x] Email notifications
- [x] DocuSign integration
- [x] Admin dashboard
- [x] Light-only premium theme
- [x] Token-based access
- [x] Expiry management

### Future Enhancements 🔮
- [ ] Resend email functionality
- [ ] Manual offer creation
- [ ] Offer templates
- [ ] Custom pricing adjustments
- [ ] SMS notifications
- [ ] WhatsApp integration
- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] Customer portal

---

## 🤝 Contributing

This is a private project for Schnell Sicher Umzug. For questions or issues, contact:

- **Email**: kontakt@schnellsicherumzug.de
- **Phone**: +49 172 9573681

---

## 📄 License

Proprietary - All rights reserved by Schnell Sicher Umzug

---

## 🙏 Acknowledgments

- **Next.js** - React framework
- **Supabase** - Backend as a service
- **DocuSign** - E-signature platform
- **PDFKit** - PDF generation
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components

---

## 📞 Support

### Development Support
- Check documentation in `/docs`
- Review error logs
- Test in development first

### Production Support
- Monitor error logs
- Check Supabase dashboard
- Verify DocuSign status
- Review email delivery

### Emergency Contacts
- **Hosting**: [Your hosting provider]
- **Supabase**: support@supabase.io
- **DocuSign**: devcenter@docusign.com

---

## 🎉 Success!

You now have a complete, production-ready offer and contract management system with:

✅ Premium PDF generation  
✅ Electronic signatures  
✅ Automated emails  
✅ Admin dashboard  
✅ Light-only premium theme  
✅ Full German localization  

**Ready to transform your moving business! 🚀**

---

**Made with ❤️ for Schnell Sicher Umzug**

*Last updated: February 2026*
