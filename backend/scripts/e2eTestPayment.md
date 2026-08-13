# End-to-End Payment Testing Guide (Hyp Pay)

## Production / staging test (recommended)

Local iframe → `localhost` is blocked by Chrome. Test on the live site instead.

1. Deploy backend (Cloud Build) and frontend (GitHub Pages) with the Hyp Pay changes.
2. Cloud Run project `budastudio-arthub` must have secrets `HYP_MASOF`, `HYP_KEY`, `HYP_PASSP` (wired in `cloudbuild.yaml`).
3. Hyp Portal → Settings → Payment Page and API → success URL:
   `https://studiobuda-backend-873405578260.me-west1.run.app/api/payment/success`
4. Open `https://arthub.studiobuda.co.il`, buy with the test card below, confirm Profile/Firestore get the transaction.

## Prerequisites (local)

1. Backend running: `cd backend && npm run dev` (port 4000)
2. Frontend running: `cd frontend && npm start` (expo)
3. A test user account in the system
4. `HYP_MASOF`, `HYP_KEY`, `HYP_PASSP` set in `backend/.env`
   - `PassP` is the **API password** from Hyp Portal → Settings → Payment Page and API, not the portal login password
   - If session creation returns Hyp `CCode=902`, the KEY/PassP do not match this terminal
5. Hyp Portal success URL: `{BACKEND_URL}/api/payment/success`
6. In Hyp Portal → Settings → Payment Page and API, hide street/city/zip fields (Hyp Pay has no API flag to hide address inputs)
7. Confirm the terminal is test-only before using non-trivial amounts

## Hyp Pay Test Cards

Keep test amounts around 10 ILS.

### Success

| Field | Value |
|-------|-------|
| Card Number | 5253360311315452 |
| Expiry | 12/29 |
| CVV | 493 |
| ID (תעודת זהות) | 890108558 |

### Failure

| Field | Value |
|-------|-------|
| Card Number | 4580458045804580 |
| Expiry | Any valid date |
| CVV | 123 |
| ID | Any |

## Test 1: Purchase Punch Card (One-time Payment)

1. Open the app and log in with a test user
2. Navigate to the "רכישות" (Products) screen
3. Find a punch card product
4. Click "רכוש" (Purchase)
5. Verify:
   - [ ] Payment modal appears with security message
   - [ ] Hyp Pay checkout page loads in iframe
   - [ ] Security message mentions Hyp
6. Enter the success test card
7. Complete payment
8. Verify:
   - [ ] Our success view appears (iframe closes)
   - [ ] Continue navigates to Calendar
   - [ ] Profile / context shows the new purchase
   - [ ] Firestore `transactions` has `hypTransactionId` and `hypOrderId`

## Test 2: Purchase Subscription (Hyp-managed HK)

1. Navigate to "רכישות"
2. Find a subscription product
3. Click "רכוש"
4. Verify the security message mentions monthly Hyp charges
5. Enter the success test card
6. Complete payment
7. Verify:
   - [ ] Success toast appears
   - [ ] Transaction appears in Profile
   - [ ] Firestore row has `hypHkId`
   - [ ] "ביטול מנוי" button appears

## Test 3: Cancel Subscription

1. Navigate to Profile
2. Find an active subscription
3. Click "ביטול מנוי" and confirm
4. Verify:
   - [ ] Success toast appears
   - [ ] Hyp HK agreement is terminated (`HKStatus`)
   - [ ] Transaction `isActive` is false

## Test 4: Payment Failure

1. Purchase any product
2. Enter the failure test card
3. Verify:
   - [ ] Error stays on Hyp page (or failure redirect)
   - [ ] No Firestore transaction created

## Test 5: Signature verification

```bash
cd backend
node scripts/testPaymentService.js
```

Verify:
- [ ] One-shot and subscription `APISign` return a `pay.hyp.co.il` URL
- [ ] Tampered VERIFY is rejected

```bash
node scripts/testWebhook.js
```

(Requires the API server.) Tampered success/webhook must not create a transaction.

## Test 6: Entry-reset fallback (no charges)

```bash
cd backend
DRY_RUN=true node scripts/processRecurringPayments.js
```

## GraphQL

```graphql
mutation {
  createPaymentSession(productId: "your-product-id") {
    sessionId
    sessionUrl
    uniqueId
    isRecurring
  }
}
```
