# Firestore Rules — StudioBuda ArtHub

Rules file: `firestore.rules`

These rules allow the public trial website (YaaraArtStudioClassesSite) to:

1. **Read** active `events`, confirmed registrations, and cancellations (for open-spot filtering)
2. **Create** manual reservations in `event_manual_registrations` only when the customer name contains `אוטומטי שיעור נסיון`

Admin SDK (GraphQL backend) bypasses these rules.

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
