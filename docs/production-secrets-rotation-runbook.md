# Production Secrets Rotation Runbook

Use this after the site is stable in production.

## 1) Rotate in providers first

Rotate in this order:

1. Supabase DB password
2. Supabase service role key
3. SMTP password
4. Admin password
5. ORS API key
6. DocuSign keys/secrets

## 2) Update `.env` on VPS

Edit only:

`/var/www/schnell-bashar/.env`

Required keys:

- `DATABASE_URL`
- `DIRECT_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SMTP_PASS`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `ORS_API_KEY`
- `DOCUSIGN_*`

Security rules:

- Keep only `ADMIN_PASSWORD_HASH`
- Remove `ADMIN_PASSWORD`
- Do not keep placeholder values

## 3) Regenerate admin hash

```bash
cd /var/www/schnell-bashar
npx tsx scripts/hash-admin-password.ts 'NEW_STRONG_PASSWORD'
```

Set output into:

`ADMIN_PASSWORD_HASH="<HASH>"`

## 4) Restart runtime with new env

```bash
cd /var/www/schnell-bashar
npm run build
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
pm2 restart ecosystem.config.cjs --only schnell-sicher-umzug --update-env
pm2 save
nginx -t && systemctl reload nginx
```

## 5) Smoke checks

```bash
pm2 status
curl -I http://127.0.0.1:3000
curl -I https://schnellsicherumzug.de
curl -I https://schnellsicherumzug.de/admin/login
```

## 6) Optional safe mode during audit

Enable to prevent external sends while testing:

`SAFE_MODE_EXTERNAL_IO=true`

Disable after audit:

`SAFE_MODE_EXTERNAL_IO=false`

