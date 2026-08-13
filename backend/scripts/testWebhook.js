/**
 * Test script for Hyp Pay webhook / success endpoints.
 * Run: node scripts/testWebhook.js
 *
 * Tampered payloads should be rejected by VERIFY.
 */

const API_URL = 'http://localhost:4000';

const tamperedSuccess = {
  Id: '408941655',
  CCode: '0',
  Amount: '10',
  ACode: '0505293',
  Order: 'fake-order-id',
  Sign: 'a84b11187377554427f267a9139ad4fd7daf7fb661dd668a9b954cf41cd25904',
};

async function testSuccess(params, description) {
  console.log(`\n=== ${description} ===\n`);
  const qs = new URLSearchParams(params).toString();
  console.log('GET', `${API_URL}/api/payment/success?${qs}`);

  try {
    const response = await fetch(`${API_URL}/api/payment/success?${qs}`, {
      redirect: 'manual',
    });
    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Body (truncated):', text.slice(0, 300));
  } catch (error) {
    console.log('ERROR:', error.message);
    console.log('Make sure the server is running on http://localhost:4000');
  }
}

async function testWebhook(params, description) {
  console.log(`\n=== ${description} ===\n`);

  try {
    const response = await fetch(`${API_URL}/api/payment/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });
    const data = await response.json().catch(() => null);
    console.log('Status:', response.status, data);
  } catch (error) {
    console.log('ERROR:', error.message);
  }
}

(async () => {
  console.log('Testing Hyp Pay endpoints');
  console.log('=========================');
  console.log('Tampered Sign/Order must not create a transaction.');
  console.log('');

  await testSuccess(tamperedSuccess, 'Tampered success redirect (expect failure page)');
  await testWebhook(tamperedSuccess, 'Tampered webhook (expect 500 or ignored)');

  console.log('\n=== Tests completed ===\n');
})();
