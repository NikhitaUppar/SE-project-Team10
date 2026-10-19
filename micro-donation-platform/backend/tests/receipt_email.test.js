process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_testing_purposes_123456';
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummyKey12345';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'dummySecret1234567890abcdef';
process.env.RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'dummyWebhookSecret1234567890';
process.env.EMAIL_FROM = 'noreply@microdonation.dev';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const emailController = require('../src/controllers/emailController');

// Mock Supabase
jest.mock('../src/config/supabase', () => {
  const mockDonation = {
    id: '99999999-9999-9999-9999-999999999999',
    campaign_id: '22222222-2222-2222-2222-222222222222',
    donor_id: '11111111-1111-1111-1111-111111111111',
    amount: 250,
    is_anonymous: false,
    status: 'pending',
    razorpay_order_id: 'order_test_receipt_123',
    campaigns: { id: '22222222-2222-2222-2222-222222222222', title: 'Clean Water Initiative', raised_amount: 1000 },
    users: { id: '11111111-1111-1111-1111-111111111111', email: 'donor@example.com', display_name: 'Roopesh Donor' },
  };

  return {
    from: jest.fn((table) => {
      if (table === 'users') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: '11111111-1111-1111-1111-111111111111',
                  email: 'donor@example.com',
                  display_name: 'Roopesh Donor',
                  role: 'donor',
                  is_verified: true,
                },
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === 'donations') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { ...mockDonation },
                error: null,
              }),
            })),
          })),
          update: jest.fn(() => ({
            eq: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { ...mockDonation, status: 'completed' },
                  error: null,
                }),
              })),
            })),
          })),
        };
      }

      if (table === 'campaigns') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: { raised_amount: 1000 },
                error: null,
              }),
            })),
          })),
          update: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ data: {}, error: null }),
          })),
        };
      }

      return {
        select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn().mockResolvedValue({ data: {}, error: null }) })) })),
      };
    }),
  };
});

const app = require('../src/index');
const { processedOrders } = require('../src/controllers/donationController');

describe('Issue #8 - Donation Receipt Email on Success (FR-13)', () => {
  let authToken;
  const testUserId = '11111111-1111-1111-1111-111111111111';
  const secret = process.env.RAZORPAY_KEY_SECRET;

  beforeAll(() => {
    authToken = jwt.sign(
      { id: testUserId, email: 'donor@example.com', role: 'donor' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    processedOrders.clear();
  });

  describe('1. Direct Payment Verification: POST /api/donations/verify', () => {
    let sendReceiptSpy;

    beforeEach(() => {
      sendReceiptSpy = jest.spyOn(emailController, 'sendReceiptEmail').mockResolvedValue({
        success: true,
        messageId: 'test-receipt-id-123',
      });
    });

    afterEach(() => {
      sendReceiptSpy.mockRestore();
    });

    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app)
        .post('/api/donations/verify')
        .send({
          razorpay_order_id: 'order_test_receipt_123',
          razorpay_payment_id: 'pay_test_456',
          razorpay_signature: 'dummy_sig',
        });

      expect(res.status).toBe(401);
      expect(sendReceiptSpy).not.toHaveBeenCalled();
    });

    it('should reject requests with missing parameters with 400', async () => {
      const res = await request(app)
        .post('/api/donations/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ razorpay_order_id: 'order_test_receipt_123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/missing payment verification parameters/i);
      expect(sendReceiptSpy).not.toHaveBeenCalled();
    });

    it('should reject invalid HMAC payment signature with 400 and not send receipt email', async () => {
      const res = await request(app)
        .post('/api/donations/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          razorpay_order_id: 'order_test_receipt_123',
          razorpay_payment_id: 'pay_test_456',
          razorpay_signature: 'invalid_forged_signature_12345',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid payment signature/i);
      expect(sendReceiptSpy).not.toHaveBeenCalled();
    });

    it('should verify valid HMAC signature, update payment, and send receipt email with correct details', async () => {
      const orderId = 'order_test_receipt_123';
      const paymentId = 'pay_test_456789';
      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const res = await request(app)
        .post('/api/donations/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.receipt_sent).toBe(true);

      // Verify emailController.sendReceiptEmail was called with proper receipt information
      expect(sendReceiptSpy).toHaveBeenCalledTimes(1);
      const [emailArg, detailsArg] = sendReceiptSpy.mock.calls[0];
      expect(emailArg).toBe('donor@example.com');
      expect(detailsArg.transactionId).toBe(paymentId);
      expect(detailsArg.amount).toBe(250);
      expect(detailsArg.campaignName).toBe('Clean Water Initiative');
      expect(detailsArg.donorName).toBe('Roopesh Donor');
    });

    it('should enforce idempotency: second verification call does NOT send duplicate receipt email', async () => {
      const orderId = 'order_test_receipt_idempotent';
      const paymentId = 'pay_test_idempotent_123';
      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      // First call
      const res1 = await request(app)
        .post('/api/donations/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
        });

      expect(res1.status).toBe(200);
      expect(sendReceiptSpy).toHaveBeenCalledTimes(1);

      // Second identical call
      const res2 = await request(app)
        .post('/api/donations/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
        });

      expect(res2.status).toBe(200);
      expect(res2.body.already_processed).toBe(true);
      // Still only called once! No duplicate email sent
      expect(sendReceiptSpy).toHaveBeenCalledTimes(1);
    });

    it('should not fail payment completion if email service fails temporarily', async () => {
      sendReceiptSpy.mockRejectedValueOnce(new Error('SMTP connection timeout'));

      const orderId = 'order_test_email_fail';
      const paymentId = 'pay_test_email_fail_456';
      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const res = await request(app)
        .post('/api/donations/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('2. Webhook Receipt Handling: POST /api/donations/webhook', () => {
    let sendReceiptSpy;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    beforeEach(() => {
      sendReceiptSpy = jest.spyOn(emailController, 'sendReceiptEmail').mockResolvedValue({
        success: true,
        messageId: 'test-webhook-receipt-id',
      });
    });

    afterEach(() => {
      sendReceiptSpy.mockRestore();
    });

    it('should send receipt email on payment.captured webhook event', async () => {
      const payload = {
        entity: 'event',
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_webhook_test_1',
              order_id: 'order_webhook_test_1',
              amount: 25000,
              currency: 'INR',
              status: 'captured',
              email: 'webhookdonor@example.com',
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
      expect(sendReceiptSpy).toHaveBeenCalledTimes(1);
      const [emailArg] = sendReceiptSpy.mock.calls[0];
      expect(emailArg).toBe('webhookdonor@example.com');
    });

    it('should not send receipt email when payment.failed event is received', async () => {
      const payload = {
        entity: 'event',
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_fail_test',
              order_id: 'order_fail_test',
              amount: 25000,
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
      expect(sendReceiptSpy).not.toHaveBeenCalled();
    });
  });

  describe('3. Unit Testing sendReceiptEmail Helper', () => {
    it('should reject missing or invalid email with { success: false }', async () => {
      const res1 = await emailController.sendReceiptEmail(null, { amount: 100 });
      expect(res1.success).toBe(false);
      expect(res1.reason).toMatch(/invalid or missing/i);

      const res2 = await emailController.sendReceiptEmail('invalid-email-no-at', { amount: 100 });
      expect(res2.success).toBe(false);
    });

    it('should format receipt reference and INR currency properly without throwing', async () => {
      const sendMailSpy = jest.spyOn(emailController.transporter, 'sendMail').mockResolvedValue({ messageId: 'mock-123' });

      process.env.TEST_LIVE_SMTP = 'true';
      const res = await emailController.sendReceiptEmail('test@example.com', {
        donorName: 'Roopesh',
        amount: 500,
        campaignName: 'Education For All',
        date: 'October 19, 2026',
        transactionId: 'pay_99887766',
      });
      delete process.env.TEST_LIVE_SMTP;

      expect(res.success).toBe(true);
      expect(sendMailSpy).toHaveBeenCalledTimes(1);
      const mailOptions = sendMailSpy.mock.calls[0][0];
      expect(mailOptions.to).toBe('test@example.com');
      expect(mailOptions.subject).toContain('Education For All');
      expect(mailOptions.html).toContain('₹500.00');
      expect(mailOptions.html).toContain('pay_99887766');
      expect(mailOptions.html).toContain('Roopesh');

      sendMailSpy.mockRestore();
    });
  });
});
