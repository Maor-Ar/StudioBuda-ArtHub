/**
 * Test script for Payment Service
 * Run: node scripts/testPaymentService.js
 */

import paymentService from '../src/services/paymentService.js';
import logger from '../src/utils/logger.js';

async function testCreateSession() {
  console.log('\n=== Testing ZCredit CreateSession API ===\n');
  
  try {
    const session = await paymentService.createCheckoutSession(
      'test-user-123',
      'punch-card-5',
      { 
        type: 'punch_card', 
        price: 425, 
        name: 'כרטיסיה 5 כניסות' 
      }
    );
    
    console.log('✅ SUCCESS! Session created:');
    console.log('   Session ID:', session.sessionId);
    console.log('   Session URL:', session.sessionUrl);
    console.log('   Is Recurring:', session.isRecurring);
    console.log('   Unique ID:', session.uniqueId);
    
    return session;
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    console.log('   Code:', error.code);
    return null;
  }
}

async function testSubscriptionSession() {
  console.log('\n=== Testing Subscription Session (with token) ===\n');
  
  try {
    const session = await paymentService.createCheckoutSession(
      'test-user-456',
      'subscription-4-monthly',
      { 
        type: 'subscription', 
        price: 330, 
        name: 'מנוי 4 כניסות בחודש',
        monthlyEntries: 4
      }
    );
    
    console.log('✅ SUCCESS! Subscription session created:');
    console.log('   Session ID:', session.sessionId);
    console.log('   Session URL:', session.sessionUrl);
    console.log('   Is Recurring:', session.isRecurring);
    
    return session;
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return null;
  }
}

// Run tests
(async () => {
  await testCreateSession();
  await testSubscriptionSession();
  console.log('\n=== Tests completed ===\n');
  process.exit(0);
})();
