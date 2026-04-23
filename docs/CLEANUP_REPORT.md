# Cleanup Report

## Intended Removals From Git
- Runtime logs and pid files
- Temporary preview PDFs under `tmp`
- Root-level preview artifact `offer-preview.pdf`
- Temporary command scratch file `tmp-remote-cmd.txt`

## Ignored Files To Enforce
- `.env`
- `.env.*`
- `.next/`
- `.vercel/`
- `node_modules/`
- `tmp/`
- `*.log`
- `*.pid`
- `public/uploads/`
- generated private PDFs

## Legacy Files Kept For Now
- `Dockerfile`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `nginx.conf`
- `ecosystem.config.cjs`

Reason:
- They are legacy Hostinger/VPS deployment artifacts and still document how the current live stack previously worked.
- They should remain during migration, but not be documented as the production target.

## Files Requiring Owner Decision
- Any historical runtime uploads living outside git but still referenced in production
- Whether old DocuSign credentials/integration should be retired immediately after internal-signing rollout

## Storage Migration Notes
- Public static marketing assets remain in `public/media`
- Private PDFs and signed contracts must move to protected object storage access patterns
- New document downloads will be proxied through authenticated API routes
- `/tmp` may be used only as ephemeral scratch space during PDF rendering
