# Firestore Rules — StudioBuda ArtHub

Rules file: `firestore.rules`

These rules allow the public trial website (YaaraArtStudioClassesSite) to:

1. **Read** active `events`, confirmed registrations, cancellations, and `occurrence_counts` (for open-spot filtering)
2. **Create** manual reservations in `event_manual_registrations` only when the customer name contains `אוטומטי שיעור נסיון` (must include `dateKey`)
3. **Create/update** `occurrence_counts` so trial reservations stay in sync with ArtHub capacity checks
   - create: seed/heal a missing counter (`count` 0–50)
   - update: only raise `count` (increment or heal); never decrement/reset from clients

Admin SDK (GraphQL backend) bypasses these rules.

## Why `occurrence_counts` matters

ArtHub capacity checks read `occurrence_counts/{eventId}_{YYYY-MM-DD}.count`.
If the trial site writes only to `event_manual_registrations` and skips the counter, the app can still see free spots and allow overbooking.

## Deploy (dev / prod — same Firebase project today)

```bash
cd StudioBuda-ArtHub/StudioBuda-ArtHub
firebase login
firebase use studiobuda-arthub
firebase deploy --only firestore:rules
```

## Firebase authorized domains

In Firebase Console → Authentication → Settings → Authorized domains, ensure:

- `localhost`
- `studiobuda.co.il`
- any GitHub Pages host still in use

Firestore query indexes: if the console prompts for composite indexes on
`event_registrations` / `event_manual_registrations` (`eventId` + `status`), create them from the error link.
