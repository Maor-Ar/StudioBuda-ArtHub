/**
 * Test script for Payment Webhook
 * Run: node scripts/testWebhook.js
 * 
 * This simulates what ZCredit sends to our callback endpoint
 */

const API_URL = 'http://localhost:4000';

// Sample callback data that ZCredit would send
const sampleCallback = {
  SessionId: 'test-session-123',
  ReferenceNumber: '12345678',
  Token: 'test-token-abc123',
  Total: 425,
  CardNum: '9001', // Last 4 digits
  CardName: 'Visa',
  ApprovalNumber: 'AP123456',
  UniqueID: 'test-user-123-punch-card-5-1768815677339',
  CustomerEmail: 'test@example.com',
  CustomerName: 'Test User',
  CustomerPhone: '0501234567',
  ExpDate_MMYY: '1228',
};

// Test callback for subscription (with token)
const subscriptionCallback = {
  SessionId: 'test-session-456',
  ReferenceNumber: '87654321',
  Token: 'subscription-token-xyz789',
  Total: 330,
  CardNum: '4242',
  CardName: 'Mastercard',
  ApprovalNumber: 'AP654321',
  UniqueID: 'test-user-456-subscription-4-monthly-1768815677834',
  CustomerEmail: 'subscriber@example.com',
  CustomerName: 'Subscriber User',
  CustomerPhone: '0509876543',
  ExpDate_MMYY: '0329',
};

async function testCallback(callbackData, description) {
  console.log(`\n=== ${description} ===\n`);
  console.log('Sending callback data:', JSON.stringify(callbackData, null, 2));

  try {
    const response = await fetch(`${API_URL}/api/payment/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(callbackData),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('\n✅ SUCCESS:', data);
    } else {
      console.log('\n❌ FAILED:', response.status, data);
    }
  } catch (error) {
    console.log('\n❌ ERROR:', error.message);
    console.log('Make sure the server is running on http://localhost:4000');
  }
}

async function testStatus(uniqueId) {
  console.log(`\n=== Testing Status Endpoint ===\n`);
  console.log('Checking status for uniqueId:', uniqueId);

  try {
    const response = await fetch(`${API_URL}/api/payment/status/${encodeURIComponent(uniqueId)}`);
    const data = await response.json();
    console.log('Status response:', data);
  } catch (error) {
    console.log('ERROR:', error.message);
  }
}

// Run tests
(async () => {
  console.log('Testing Payment Webhook Endpoint');
  console.log('================================');
  console.log('Note: This test requires:');
  console.log('  1. The server to be running on localhost:4000');
  console.log('  2. Firebase credentials to be set up');
  console.log('  3. A test user with ID "test-user-123" and "test-user-456" to exist in the database');
  console.log('');

  // Test 1: Punch card callback
  await testCallback(sampleCallback, 'Testing Punch Card Callback');

  // Test 2: Subscription callback
  await testCallback(subscriptionCallback, 'Testing Subscription Callback');

  // Test 3: Check status
  await testStatus(sampleCallback.UniqueID);

  console.log('\n=== Tests completed ===\n');
})();
