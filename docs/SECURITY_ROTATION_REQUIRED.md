# Security Rotation Required

## Why This Document Exists
Unsafe values were found in example-style configuration files during repository cleanup. The values themselves were not printed, but they were inappropriate for committed example files.

## Categories That Must Be Considered Rotated
- SMTP credentials
- admin bootstrap credentials
- ORS / routing API credentials
- database connection credentials if they were ever copied into tracked example files
- any signing or PDF rendering secrets that were previously placed in examples

## Actions Already Taken
- `.env.example` was sanitized and replaced with placeholders only
- no actual secret values are included in the current sanitized example file

## Required Operational Follow-Up
1. Rotate any credential that was previously copied into committed example/config files.
2. Update Vercel production environment variables with the rotated values.
3. Remove any stale local backups containing old secrets if they are no longer needed.
