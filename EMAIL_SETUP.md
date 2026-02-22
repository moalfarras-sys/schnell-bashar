# E-Mail Setup Guide

## 1. SMTP Configuration (.env)

Add these variables to your `.env` file:

```env
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT="587"
SMTP_USER="kontakt@schnellsicherumzug.de"
SMTP_PASS="your-email-password"
SMTP_FROM="Schnell Sicher Umzug <kontakt@schnellsicherumzug.de>"
```

**Important:** `SMTP_PASS` must be the actual password for `kontakt@schnellsicherumzug.de`. For Hostinger, this is the mailbox password you set when creating the email account.

## 2. Test Email

After configuring `.env`, test the connection:

```bash
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "your-personal@email.com"}'
```

Or from browser console:
```javascript
fetch('/api/test-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ to: 'your@email.com' })
}).then(r => r.json()).then(console.log)
```

## 3. SPF, DKIM, DMARC (DNS)

These records improve deliverability and reduce spam classification. Configure them in your domain's DNS (where schnellumzug-berlin.de or schnellsicherumzug.de is managed).

### SPF (Sender Policy Framework)
Allows receiving servers to verify that your Hostinger server is authorized to send for your domain.

```
Type: TXT
Name: @ (or schnellsicherumzug.de)
Value: v=spf1 include:hostinger.com ~all
```

### DKIM (DomainKeys Identified Mail)
Adds a signature that proves the email wasn't modified. Hostinger provides DKIM keys in the control panel.

1. Log in to Hostinger
2. Go to Emails → Manage → Domain Authentication
3. Enable DKIM and copy the DNS record provided
4. Add the TXT record to your domain's DNS

### DMARC (Domain-based Message Authentication)
Tells receiving servers what to do with emails that fail SPF/DKIM.

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:kontakt@schnellsicherumzug.de
```

- `p=none` – Monitor only
- `p=quarantine` – Send to spam if failed
- `p=reject` – Reject if failed

## 4. Hostinger-Specific

- Use **SMTP** (port 587, STARTTLS), not POP3/IMAP
- Enable "Less secure app access" if required, or use an App Password
- Check Hostinger's Email → SMTP settings for exact host/port
- Ensure the mailbox `kontakt@schnellsicherumzug.de` exists

## 5. Troubleshooting

| Problem | Solution |
|---------|----------|
| "SMTP not configured" | Add SMTP_HOST, SMTP_USER, SMTP_PASS to .env |
| Authentication failed | Verify SMTP_PASS, check Hostinger mailbox |
| Emails in spam | Configure SPF, DKIM, DMARC |
| Connection timeout | Check firewall, try port 465 (SSL) |

## 6. Logging

Email send attempts are logged. Check server console for:
- `[mailer] Email sent to ...` – Success
- `[mailer] Send failed: ...` – Error details
