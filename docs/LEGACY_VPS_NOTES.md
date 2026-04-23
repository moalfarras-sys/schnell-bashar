# Legacy VPS Notes

## Status
The website runtime target is Vercel. The old VPS stack is now legacy infrastructure.

## Legacy Files Still Present In Repo
- `Dockerfile`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `nginx.conf`
- `ecosystem.config.cjs`

## Why They Were Not Removed Yet
- they still document the previous production shape
- they are useful while verifying the final migration off the VPS

## What Still Depends On The VPS
- production PostgreSQL, until it is migrated to Supabase Postgres

## What No Longer Should Depend On The VPS
- website frontend delivery
- public DNS
- admin media uploads in production
- public marketing assets
