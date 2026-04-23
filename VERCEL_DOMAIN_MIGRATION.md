# Vercel Domain Migration

## Current DNS Shape
- apex `@` -> `76.76.21.21`
- `www` -> `76.76.21.21`

## Canonical Host
- `https://schnellsicherumzug.de`

## Required Vercel Domains
- `schnellsicherumzug.de`
- `www.schnellsicherumzug.de`

## DNS Rules
- keep MX/TXT/DKIM email records intact
- remove legacy VPS A/AAAA records
- keep only Vercel-targeted web records

## Verification
- `https://schnellsicherumzug.de`
- `https://www.schnellsicherumzug.de`
- `https://schnellsicherumzug.de/robots.txt`
- `https://schnellsicherumzug.de/sitemap.xml`

## Important
DNS can already point to Vercel while the database still runs on the VPS. That is not enough for safe VPS shutdown. Database cutover must be completed separately.
