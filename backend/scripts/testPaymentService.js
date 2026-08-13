/**
 * Test script for Hyp Pay session creation and VERIFY rejection.
 * Run: node scripts/testPaymentService.js
 */

import paymentService from '../src/services/paymentService.js';

async function testCreateSession() {
  console.log('\n=== Testing Hyp Pay APISign (one-shot) ===\n');

  try {
    const session = await paymentService.createCheckoutSession(
      'test-user-123',
      'punch-card-5',
      {
        type: 'punch_card',
        price: 10,
        name: 'כרטיסיה 5 כניסות',
        totalEntries: 5,
      }
    );

    console.log('SUCCESS! Session created:');
    console.log('   Session ID:', session.sessionId);
    console.log('   Session URL:', session.sessionUrl);
    console.log('   Is Recurring:', session.isRecurring);
    console.log('   Unique ID:', session.uniqueId);

    return session;
  } catch (error) {
    console.log('ERROR:', error.message);
    console.log('   Code:', error.code);
    return null;
  }
}

async function testSubscriptionSession() {
  console.log('\n=== Testing Hyp Pay APISign (subscription HK) ===\n');

  try {
    const session = await paymentService.createCheckoutSession(
      'test-user-456',
      'subscription-4-monthly',
      {
        type: 'subscription',
        price: 10,
        name: 'מנוי 4 כניסות בחודש',
        monthlyEntries: 4,
      }
    );

    console.log('SUCCESS! Subscription session created:');
    console.log('   Session ID:', session.sessionId);
    console.log('   Session URL:', session.sessionUrl);
    console.log('   Is Recurring:', session.isRecurring);
    console.log('   Unique ID:', session.uniqueId);

    return session;
  } catch (error) {
    console.log('ERROR:', error.message);
    return null;
  }
}

async function testVerifyRejectsTampered() {
  console.log('\n=== Testing Hyp VERIFY rejects tampered params ===\n');

  const tampered =
    'Id=1&CCode=0&Amount=9999&ACode=0000000&Order=fake-order&Sign=deadbeef';
  const ok = await paymentService.verifyRedirect(tampered, {
    Id: '1',
    CCode: '0',
    Amount: '9999',
    Order: 'fake-order',
    Sign: 'deadbeef',
  });

  if (!ok) {
    console.log('SUCCESS: tampered query was rejected');
    return true;
  }

  console.log('FAIL: tampered query was accepted');
  return false;
}

(async () => {
  await testCreateSession();
  await testSubscriptionSession();
  await testVerifyRejectsTampered();
  console.log('\n=== Tests completed ===\n');
  process.exit(0);
})();
