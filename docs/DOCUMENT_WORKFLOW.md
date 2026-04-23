# Document Workflow

## Current Stable Flow
1. Customer sends request / booking.
2. Request is stored as an `Order`.
3. Admin can create or open linked documents from the inquiry.
4. Documents stay in draft/review state until explicitly approved.
5. Only approved document versions can be exposed for customer signing.

## Relationships
- `Order` = original inquiry/booking record
- `Document` = office-facing business document
- `DocumentVersion` = frozen snapshot/version history
- `SigningToken` = time-limited signing access bound to approved document state

## Signature Gate
- no customer signature on drafts
- no signing before admin approval
- editing after approval invalidates the old approval/token path

## PDF Output
- admin can preview/generate documents from the document workflow
- storage should remain outside `public/`
- the public website must never expose private document paths directly
