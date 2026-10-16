process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_12345';
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummyKey12345';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'dummySecret1234567890abcdef';
process.env.RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'dummyWebhookSecret1234567890';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const app = require('../src/index');

async function runTests() {
  console.log('\n================================================================');
  console.log('   VERIFICATION SUITE: ISSUE #7 (RAZORPAY PAYMENT INTEGRATION)   ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  const authToken = jwt.sign(
    { id: '11111111-1111-1111-1111-111111111111', email: 'donor@example.com', role: 'donor' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log('--- TEST GROUP 1: AMOUNT LIMITS & ORDER CREATION ---');

  // Test 1: Unauthenticated request rejected
  try {
    const res = await request(app)
      .post('/api/donations/create-order')
      .send({ amount: 100, campaign_id: 'test-123' });
    assert(res.status === 401, 'POST /create-order without token returns 401 Unauthorized');
  } catch (e) {
    assert(false, 'POST /create-order without token threw: ' + e.message);
  }

  // Test 2: Amount > 500 rejected
  try {
    const res = await request(app)
      .post('/api/donations/create-order')
      .set('Authorization', 'Bearer ' + authToken)
      .send({ amount: 501, campaign_id: 'test-123' });
    assert(res.status === 400 && res.body.error.includes('500'), 'Donation amount > ₹500 (₹501) rejected with 400');
  } catch (e) {
    assert(false, 'Amount > 500 test error: ' + e.message);
  }

  // Test 3: Amount < 1 rejected
  try {
    const res = await request(app)
      .post('/api/donations/create-order')
      .set('Authorization', 'Bearer ' + authToken)
      .send({ amount: 0, campaign_id: 'test-123' });
    assert(res.status === 400 && res.body.error.includes('1'), 'Donation amount < ₹1 (₹0) rejected with 400');
  } catch (e) {
    assert(false, 'Amount < 1 test error: ' + e.message);
  }

  // Test 4: Negative amount rejected
  try {
    const res = await request(app)
      .post('/api/donations/create-order')
      .set('Authorization', 'Bearer ' + authToken)
      .send({ amount: -100, campaign_id: 'test-123' });
    assert(res.status === 400, 'Negative donation amount (-₹100) rejected with 400');
  } catch (e) {
    assert(false, 'Negative amount test error: ' + e.message);
  }

  // Test 5: Non-numeric amount rejected
  try {
    const res = await request(app)
      .post('/api/donations/create-order')
      .set('Authorization', 'Bearer ' + authToken)
      .send({ amount: 'invalid', campaign_id: 'test-123' });
    assert(res.status === 400, 'Non-numeric donation amount rejected with 400');
  } catch (e) {
    assert(false, 'Non-numeric test error: ' + e.message);
  }

  // Test 6: Missing campaign_id rejected
  try {
    const res = await request(app)
      .post('/api/donations/create-order')
      .set('Authorization', 'Bearer ' + authToken)
      .send({ amount: 100 });
    assert(res.status === 400 && res.body.error.includes('Campaign ID'), 'Missing campaign_id rejected with 400');
  } catch (e) {
    assert(false, 'Missing campaign_id test error: ' + e.message);
  }

  // Test 7: Valid donation within limits (₹250) creates order
  try {
    const res = await request(app)
      .post('/api/donations/create-order')
      .set('Authorization', 'Bearer ' + authToken)
      .send({ amount: 250, campaign_id: 'test-123' });
    assert(
      res.status === 200 &&
      res.body.order_id &&
      res.body.order_id.startsWith('order_') &&
      res.body.amount === 25000 &&
      res.body.currency === 'INR',
      'Valid donation ₹250 successfully returns Razorpay order ID, amount in paise (25000), currency INR'
    );
  } catch (e) {
    assert(false, 'Valid donation test error: ' + e.message);
  }

  // Test 8: Boundary amount ₹1 creates order
  try {
    const res = await request(app)
      .post('/api/donations/create-order')
      .set('Authorization', 'Bearer ' + authToken)
      .send({ amount: 1, campaign_id: 'test-123' });
    assert(res.status === 200 && res.body.amount === 100, 'Minimum boundary amount (₹1) returns amount 100 paise');
  } catch (e) {
    assert(false, 'Boundary ₹1 test error: ' + e.message);
  }

  // Test 9: Boundary amount ₹500 creates order
  try {
    const res = await request(app)
      .post('/api/donations/create-order')
      .set('Authorization', 'Bearer ' + authToken)
      .send({ amount: 500, campaign_id: 'test-123' });
    assert(res.status === 200 && res.body.amount === 50000, 'Maximum boundary amount (₹500) returns amount 50000 paise');
  } catch (e) {
    assert(false, 'Boundary ₹500 test error: ' + e.message);
  }

  console.log('\n--- TEST GROUP 2: WEBHOOK & HMAC SIGNATURE VERIFICATION ---');

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

  // Test 10: Missing signature header rejected
  try {
    const res = await request(app)
      .post('/api/donations/webhook')
      .send({ event: 'payment.captured' });
    assert(res.status === 400 && res.body.error.includes('Missing'), 'Webhook without signature header rejected with 400');
  } catch (e) {
    assert(false, 'Missing signature header test error: ' + e.message);
  }

  // Test 11: Invalid signature rejected
  try {
    const res = await request(app)
      .post('/api/donations/webhook')
      .set('x-razorpay-signature', 'forged_fake_signature_hash_0000000000')
      .send({ event: 'payment.captured' });
    assert(res.status === 400 && res.body.error.includes('Invalid signature'), 'Webhook with forged/tampered signature rejected with 400');
  } catch (e) {
    assert(false, 'Forged signature test error: ' + e.message);
  }

  // Test 12: Valid HMAC signature for payment.captured accepted
  try {
    const payload = {
      entity: 'event',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_test_987654321',
            order_id: 'order_test_123456789',
            amount: 25000,
            currency: 'INR',
            status: 'captured',
            email: 'donor@example.com',
          },
        },
      },
    };
    const payloadStr = JSON.stringify(payload);
    const validSignature = crypto.createHmac('sha256', webhookSecret).update(payloadStr).digest('hex');

    const res = await request(app)
      .post('/api/donations/webhook')
      .set('x-razorpay-signature', validSignature)
      .set('Content-Type', 'application/json')
      .send(payload);

    assert(res.status === 200 && res.body.status === 'ok', 'Webhook with authentic HMAC SHA-256 signature returns 200 OK');
  } catch (e) {
    assert(false, 'Valid HMAC test error: ' + e.message);
  }

  // Test 13: Valid HMAC signature for payment.failed accepted
  try {
    const payload = {
      entity: 'event',
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_fail_999',
            order_id: 'order_fail_999',
            amount: 10000,
            currency: 'INR',
            status: 'failed',
          },
        },
      },
    };
    const payloadStr = JSON.stringify(payload);
    const validSignature = crypto.createHmac('sha256', webhookSecret).update(payloadStr).digest('hex');

    const res = await request(app)
      .post('/api/donations/webhook')
      .set('x-razorpay-signature', validSignature)
      .set('Content-Type', 'application/json')
      .send(payload);

    assert(res.status === 200 && res.body.status === 'ok', 'payment.failed webhook event handled properly with 200 OK');
  } catch (e) {
    assert(false, 'Payment failed test error: ' + e.message);
  }

  console.log('\n================================================================');
  console.log(`   TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}   `);
  console.log('================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
