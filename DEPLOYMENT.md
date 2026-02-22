# Production Deployment Guide

## 🚀 Deploy Schnell Sicher Umzug to Production

This guide covers deploying the complete offer and contract system to production.

---

## Pre-Deployment Checklist

### ✅ Development Testing

- [ ] All features tested locally
- [ ] Order creation works
- [ ] Offer generation works
- [ ] PDF generation works
- [ ] Email sending works
- [ ] DocuSign signing works
- [ ] Webhook processing works
- [ ] Admin dashboard accessible
- [ ] Dark/Light mode works
- [ ] Mobile responsive

### ✅ Environment Setup

- [ ] Production Supabase project created
- [ ] Production DocuSign account ready
- [ ] Production domain configured
- [ ] SSL certificate installed
- [ ] SMTP credentials verified
- [ ] Database backup strategy in place

### ✅ Security Review

- [ ] All secrets in environment variables
- [ ] No hardcoded credentials
- [ ] Admin routes protected
- [ ] Token expiry configured
- [ ] Webhook signature verification (recommended)
- [ ] Rate limiting configured (recommended)
- [ ] CORS configured properly

---

## Deployment Platforms

Choose your deployment platform:

### Option 1: Vercel (Recommended)

**Pros:**
- Easy deployment
- Automatic HTTPS
- Edge functions
- Great Next.js support
- Free tier available

**Cons:**
- Function timeout limits
- Cold starts

### Option 2: VPS (DigitalOcean, Hetzner, etc.)

**Pros:**
- Full control
- No timeout limits
- Better for long-running processes

**Cons:**
- More setup required
- Manual SSL configuration
- Server maintenance

### Option 3: Docker + Cloud Provider

**Pros:**
- Portable
- Scalable
- Consistent environment

**Cons:**
- More complex setup
- Higher costs

---

## Deployment Steps (Vercel)

### 1. Prepare Repository

```bash
# Commit all changes
git add .
git commit -m "Production ready"

# Push to GitHub
git push origin main
```

### 2. Create Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure build settings:
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

### 3. Configure Environment Variables

In Vercel dashboard → Settings → Environment Variables, add:

```env
# Base URL (use your production domain)
NEXT_PUBLIC_BASE_URL="https://schnellumzug-berlin.de"

# Database (use production Supabase or external PostgreSQL)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# SMTP
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT="587"
SMTP_USER="kontakt@schnellsicherumzug.de"
SMTP_PASS="your-production-password"
SMTP_FROM="Schnell Sicher Umzug <kontakt@schnellsicherumzug.de>"
ORDER_RECEIVER_EMAIL="kontakt@schnellsicherumzug.de"

# Supabase (production project)
NEXT_PUBLIC_SUPABASE_URL="https://your-prod-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-prod-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-prod-service-role-key"

# DocuSign (production account)
DOCUSIGN_INTEGRATION_KEY="your-prod-integration-key"
DOCUSIGN_USER_ID="your-prod-user-id"
DOCUSIGN_ACCOUNT_ID="your-prod-account-id"
DOCUSIGN_PRIVATE_KEY_PATH="./docusign-private.key"
DOCUSIGN_REDIRECT_URI="https://schnellumzug-berlin.de/api/docusign/callback"
DOCUSIGN_WEBHOOK_SECRET="generate-new-random-secret"

# Admin
ADMIN_EMAIL="admin@schnellsicherumzug.de"
ADMIN_PASSWORD_HASH="generate-with-npm-run-admin:hash"
SESSION_SECRET="generate-new-random-secret"

# Offer Configuration
OFFER_VALIDITY_DAYS=7
```

### 4. Add DocuSign Private Key

Since Vercel doesn't support file uploads, you need to convert the private key to an environment variable:

```bash
# Read the key and encode it
cat docusign-private.key | base64
```

Then in your code, decode it:

```typescript
// src/lib/docusign.ts
const privateKey = process.env.DOCUSIGN_PRIVATE_KEY_BASE64
  ? Buffer.from(process.env.DOCUSIGN_PRIVATE_KEY_BASE64, 'base64').toString('utf8')
  : readFileSync(path.resolve(process.cwd(), privateKeyPath), 'utf8');
```

Add to environment variables:
```env
DOCUSIGN_PRIVATE_KEY_BASE64="your-base64-encoded-key"
```

### 5. Deploy

```bash
# Deploy to production
vercel --prod
```

Or push to main branch and Vercel will auto-deploy.

---

## Deployment Steps (VPS)

### 1. Server Setup

```bash
# SSH into your server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Install Nginx
apt install -y nginx

# Install Certbot for SSL
apt install -y certbot python3-certbot-nginx
```

### 2. Clone Repository

```bash
# Create app directory
mkdir -p /var/www/schnell-sicher-umzug
cd /var/www/schnell-sicher-umzug

# Clone repository
git clone https://github.com/your-repo/schnell-sicher-umzug.git .

# Install dependencies
npm install

# Build application
npm run build
```

### 3. Configure Environment

```bash
# Create .env file
nano .env

# Paste all production environment variables
# Save and exit (Ctrl+X, Y, Enter)
```

### 4. Setup PM2

```bash
# Create PM2 ecosystem file
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'schnell-sicher-umzug',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/schnell-sicher-umzug',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 5. Configure Nginx

```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/schnell-sicher-umzug
```

```nginx
server {
    listen 80;
    server_name schnellumzug-berlin.de www.schnellumzug-berlin.de;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 50M;
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/schnell-sicher-umzug /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

### 6. Setup SSL

```bash
# Get SSL certificate
certbot --nginx -d schnellumzug-berlin.de -d www.schnellumzug-berlin.de

# Test auto-renewal
certbot renew --dry-run
```

---

## Post-Deployment Steps

### 1. Run Database Migrations

```bash
# On your server or via Vercel CLI
npm run prisma:deploy
```

### 2. Setup Supabase Storage

```bash
# Run storage setup
npm run setup:storage
```

### 3. Grant DocuSign Consent (Production)

Open this URL (replace with production values):

```
https://account.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=YOUR_PROD_INTEGRATION_KEY&redirect_uri=https://schnellumzug-berlin.de/api/docusign/callback
```

Click "Allow" to grant consent for production account.

### 4. Test Production Flow

1. Create test order
2. Generate offer
3. Accept offer
4. Sign contract
5. Verify webhook processing
6. Check admin dashboard

### 5. Configure DocuSign Webhook

In DocuSign dashboard:
1. Go to your app settings
2. Add webhook URL: `https://schnellumzug-berlin.de/api/docusign/webhook`
3. Enable events: `envelope-completed`
4. Save

---

## Monitoring & Maintenance

### Setup Monitoring

#### Option 1: Vercel Analytics
- Enable in Vercel dashboard
- Free tier available

#### Option 2: Custom Monitoring
- Use PM2 monitoring
- Setup error logging
- Configure alerts

### Backup Strategy

```bash
# Database backup (daily cron job)
0 2 * * * pg_dump $DATABASE_URL > /backups/db-$(date +\%Y\%m\%d).sql

# Supabase automatic backups
# Configure in Supabase dashboard
```

### Log Management

```bash
# PM2 logs
pm2 logs schnell-sicher-umzug

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## Performance Optimization

### 1. Enable Caching

```typescript
// next.config.ts
export default {
  async headers() {
    return [
      {
        source: '/media/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

### 2. Optimize Images

```bash
# Install sharp for image optimization
npm install sharp
```

### 3. Enable Compression

Nginx already handles gzip compression. Verify:

```nginx
# In /etc/nginx/nginx.conf
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

---

## Security Hardening

### 1. Rate Limiting

Install rate limiting middleware:

```bash
npm install express-rate-limit
```

```typescript
// src/middleware/rate-limit.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
```

### 2. Webhook Signature Verification

```typescript
// src/app/api/docusign/webhook/route.ts
import crypto from 'crypto';

function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.DOCUSIGN_WEBHOOK_SECRET!;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### 3. CORS Configuration

```typescript
// next.config.ts
export default {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://schnellumzug-berlin.de' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
        ],
      },
    ];
  },
};
```

---

## Rollback Plan

### Vercel

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]
```

### VPS

```bash
# Keep previous version
cd /var/www/schnell-sicher-umzug
git tag production-$(date +%Y%m%d)
git push --tags

# Rollback if needed
git checkout production-YYYYMMDD
npm install
npm run build
pm2 restart schnell-sicher-umzug
```

---

## Troubleshooting Production Issues

### Issue: 500 Internal Server Error

1. Check logs:
   ```bash
   # Vercel
   vercel logs
   
   # VPS
   pm2 logs
   ```

2. Check environment variables
3. Verify database connection
4. Check Supabase status

### Issue: DocuSign Webhook Not Working

1. Verify webhook URL is publicly accessible
2. Check webhook configuration in DocuSign
3. Test with ngrok first
4. Verify signature verification

### Issue: Email Not Sending

1. Check SMTP credentials
2. Verify firewall allows SMTP port
3. Check email logs
4. Test SMTP connection

### Issue: PDF Generation Fails

1. Check memory limits
2. Verify PDFKit installation
3. Check file permissions
4. Review error logs

---

## Production Checklist

Before going live:

- [ ] All environment variables set
- [ ] Database migrated
- [ ] Supabase storage configured
- [ ] DocuSign consent granted (production)
- [ ] SSL certificate installed
- [ ] Domain configured
- [ ] Monitoring enabled
- [ ] Backups configured
- [ ] Error logging setup
- [ ] Test complete flow
- [ ] Admin access verified
- [ ] Email sending verified
- [ ] PDF generation verified
- [ ] Webhook processing verified
- [ ] Performance tested
- [ ] Security hardened
- [ ] Documentation updated

---

## Support & Maintenance

### Regular Tasks

- **Daily**: Check error logs
- **Weekly**: Review offer statistics
- **Monthly**: Database backup verification
- **Quarterly**: Security audit
- **Yearly**: SSL certificate renewal (automatic with Certbot)

### Emergency Contacts

- **Hosting Support**: [Your hosting provider]
- **Supabase Support**: support@supabase.io
- **DocuSign Support**: devcenter@docusign.com

---

## Success Metrics

Track these metrics:

- Offers created per day
- Acceptance rate
- Signing completion rate
- Average time to sign
- Email delivery rate
- Error rate
- Response time

---

**You're ready for production! 🚀**

Good luck with your deployment!
