# Legacy VPS Files

The following files remain in the repository only as migration references while production is moved to Vercel:

- `Dockerfile`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `nginx.conf`
- `ecosystem.config.cjs`

## Status
- Not the target production deployment path
- Must not be referenced as the primary deployment instructions after the Vercel migration docs are updated

## Removal Condition
- Remove after:
  - Vercel deployment is live
  - domain migration is complete
  - storage and document generation no longer depend on VPS-only assumptions
