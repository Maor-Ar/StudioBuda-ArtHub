# End-to-End Payment Testing Guide

## Prerequisites

1. Backend running: `cd backend && npm run dev` (port 4000)
2. Frontend running: `cd frontend && npm start` (expo)
3. A test user account in the system

## ZCredit Test Cards

### Primary Test Card (Recommended)

| Field | Value |
|-------|-------|
| Card Number | 590000144 |
| Expiry | 03/22 |
| CVV | 686 |
| ID (תעודת זהות) | 890108566 |
| Card Type | ישראכרט (Isracard) |

### Additional Test Cards

| Card Number | CVV | Expiry | Result |
|-------------|-----|--------|--------|
| 4557564320040077 | Any 3 digits | Any future date | Success |
| 4557564320040085 | Any 3 digits | Any future date | Declined |
| 4557564320040093 | Any 3 digits | Any future date | Card blocked |

## Test 1: Purchase Punch Card (One-time Payment)

1. Open the app and log in with a test user
2. Navigate to the "רכישות" (Products) screen
3. Find a punch card product (e.g., "כרטיסייה 5 כניסות")
4. Click "רכוש" (Purchase)
5. Verify:
   - [ ] Payment modal appears with security message
   - [ ] ZCredit checkout page loads in iframe
   - [ ] Security message shows: "פרטי התשלום שלך לא נשמרים אצלנו"
6. Enter test card details:
   - Card: 590000144
   - Expiry: 03/22
   - CVV: 686
   - ID: 890108566
7. Complete payment
8. Verify:
   - [ ] Success toast appears
   - [ ] Modal closes automatically
   - [ ] Transaction appears in Profile > "מנויים וכרטיסיות פעילים"
   - [ ] Entries count shows correctly

## Test 2: Purchase Subscription (Recurring Payment)

1. Navigate to "רכישות" screen
2. Find a subscription product (e.g., "מנוי 4 כניסות בחודש")
3. Click "רכוש"
4. Verify:
   - [ ] Security message mentions MAX: "החיובים החודשיים יבוצעו דרך MAX"
5. Enter test card details:
   - Card: 590000144
   - Expiry: 03/22
   - CVV: 686
   - ID: 890108566
6. Complete payment
7. Verify:
   - [ ] Success toast appears
   - [ ] Transaction appears in Profile
   - [ ] Shows "תוקף עד: [date +30 days]"
   - [ ] Shows card info (last 4 digits)
   - [ ] "ביטול מנוי" button appears

## Test 3: Cancel Subscription

1. Navigate to Profile screen
2. Find an active subscription
3. Click "ביטול מנוי"
4. Verify:
   - [ ] Warning popup appears with Hebrew text
   - [ ] Shows access end date
   - [ ] Has "ביטול" and "אישור הביטול" buttons
5. Click "אישור הביטול"
6. Verify:
   - [ ] Success toast appears
   - [ ] Subscription no longer shows cancel button
   - [ ] (Optional) Transaction marked as inactive in database

## Test 4: Payment Failure

1. Navigate to "רכישות" screen
2. Select any product
3. Enter declined card: 4557564320040085 (or enter invalid details)
4. Attempt payment
5. Verify:
   - [ ] Error message appears
   - [ ] User can close modal and retry
   - [ ] No transaction created

## Test 5: Recurring Payment Script (Dry Run)

```bash
cd backend
DRY_RUN=true node scripts/processRecurringPayments.js
```

Verify:
- [ ] Script runs without errors
- [ ] Lists active subscriptions
- [ ] Shows "WOULD CHARGE" for due subscriptions
- [ ] Correctly calculates days since payment

## Backend Verification

### Check ZCredit Admin Panel
1. Go to: https://pci.zcredit.co.il/webcontrol/login.aspx
2. Login with: zctest24 / TEST2025
3. Verify transactions appear in the transaction list

### Check Database (Firestore)
1. Open Firebase Console
2. Navigate to Firestore > transactions
3. Verify new transaction has:
   - [ ] `zcreditReferenceNumber` set
   - [ ] `lastPaymentDate` set
   - [ ] `paymentToken` set (for subscriptions only)
   - [ ] `cardLast4` set
   - [ ] `cardBrand` set
   - [ ] `isActive` = true

## Troubleshooting

### Payment modal shows "WebView לא נתמך בפלטפורמה זו"
- Ensure react-native-webview is installed: `npm install react-native-webview`
- Rebuild the native app: `expo prebuild && expo run:ios` (or android)

### Callback not received
- Check backend logs for callback attempts
- Verify callback URL is accessible from internet (use ngrok if testing locally)
- Check ZCredit admin panel for transaction status

### Session metadata not found
- Redis may not be running (OK - falls back gracefully)
- Session may have expired (1 hour TTL)

## GraphQL Playground Tests

### Create Payment Session
```graphql
mutation {
  createPaymentSession(
    productId: "punch-card-5"
    product: {
      id: "punch-card-5"
      name: "כרטיסייה 5 כניסות"
      type: "punch_card"
      price: 425
      totalEntries: 5
    }
  ) {
    sessionId
    sessionUrl
    uniqueId
    isRecurring
  }
}
```

### Check Payment Status
```graphql
query {
  paymentStatus(uniqueId: "user-123-punch-card-5-1234567890") {
    status
    transactionId
    message
  }
}
```

### Cancel Subscription
```graphql
mutation {
  cancelSubscription(id: "transaction-id-here") {
    id
    isActive
    lastPaymentDate
    accessEndsDate
  }
}
```
