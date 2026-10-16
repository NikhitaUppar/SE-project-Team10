process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_12345';
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummyKey12345';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'dummySecret1234567890abcdef';
process.env.RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'dummyWebhookSecret1234567890';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const app = require('../src/index');

describe('Issue #7 — Razorpay Payment Integration', () => {
  let authToken;
  const testUserId = '11111111-1111-1111-1111-111111111111';
  const testCampaignId = '22222222-2222-2222-2222-222222222222';

  beforeAll(() => {
    authToken = jwt.sign(
      { id: testUserId, email: 'testdonor@example.com', role: 'donor' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('1. Acceptance Criteria: POST /api/donations/create-order and Amount Limits', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app)
        .post('/api/donations/create-order')
        .send({ amount: 100, campaign_id: testCampaignId });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it('should reject donation amount > ₹500 with 400', async () => {
      const res = await request(app)
        .post('/api/donations/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 501, campaign_id: testCampaignId });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/between ₹1 and ₹500/i);
    });

    it('should reject donation amount < ₹1 with 400', async () => {
      const res = await request(app)
        .post('/api/donations/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 0, campaign_id: testCampaignId });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/between ₹1 and ₹500/i);
    });

    it('should reject negative donation amounts with 400', async () => {
      const res = await request(app)
        .post('/api/donations/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: -50, campaign_id: testCampaignId });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/between ₹1 and ₹500/i);
    });

    it('should reject non-numeric donation amounts with 400', async () => {
      const res = await request(app)
        .post('/api/donations/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 'invalid_amount', campaign_id: testCampaignId });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/between ₹1 and ₹500/i);
    });

    it('should reject missing campaign_id with 400', async () => {
      const res = await request(app)
        .post('/api/donations/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 100 });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/campaign id is required/i);
    });

    it('should successfully create order for valid amount within limits (₹250)', async () => {
      const res = await request(app)
        .post('/api/donations/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 250, campaign_id: testCampaignId, is_anonymous: false });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('order_id');
      expect(res.body.order_id).toMatch(/^order_/);
      expect(res.body.amount).toBe(25000); // 250 * 100 paise
      expect(res.body.currency).toBe('INR');
      expect(res.body).toHaveProperty('key_id');
    });

    it('should successfully create order for boundary minimum amount (₹1)', async () => {
      const res = await request(app)
        .post('/api/donations/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 1, campaign_id: testCampaignId });

      expect(res.status).toBe(200);
      expect(res.body.amount).toBe(100);
    });

    it('should successfully create order for boundary maximum amount (₹500)', async () => {
      const res = await request(app)
        .post('/api/donations/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 500, campaign_id: testCampaignId });

      expect(res.status).toBe(200);
      expect(res.body.amount).toBe(50000);
    });
  });

  describe('2. Acceptance Criteria: POST /api/donations/webhook and Signature Verification', () => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    it('should reject webhook request when signature header is missing with 400', async () => {
      const payload = { event: 'payment.captured' };
      const res = await request(app)
        .post('/api/donations/webhook')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/missing x-razorpay-signature/i);
    });

    it('should reject webhook request with invalid/forged signature with 400', async () => {
      const payload = { event: 'payment.captured', data: 'fake_data' };
      const res = await request(app)
        .post('/api/donations/webhook')
        .set('x-razorpay-signature', 'forged_fake_signature_abc123')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid signature/i);
    });

    it('should accept webhook request and confirm payment on valid HMAC signature for payment.captured', async () => {
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

      const payloadString = JSON.stringify(payload);
      const validSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadString)
        .digest('hex');

      const res = await request(app)
        .post('/api/donations/webhook')
        .set('x-razorpay-signature', validSignature)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', received: true });
    });

    it('should process payment.failed webhook event with valid HMAC signature', async () => {
      const payload = {
        entity: 'event',
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_fail_123',
              order_id: 'order_fail_456',
              amount: 10000,
              currency: 'INR',
              status: 'failed',
            },
          },
        },
      };

      const payloadString = JSON.stringify(payload);
      const validSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadString)
        .digest('hex');

      const res = await request(app)
        .post('/api/donations/webhook')
        .set('x-razorpay-signature', validSignature)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', received: true });
    });
  });
});
