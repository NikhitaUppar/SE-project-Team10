process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_integration_jwt_secret_key_98765';
process.env.RAZORPAY_KEY_ID = 'rzp_test_integrationKey123';
process.env.RAZORPAY_KEY_SECRET = 'dummySecret1234567890abcdef';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Mock emailController to prevent real email dispatch and observe receipt calls
jest.mock('../src/controllers/emailController', () => ({
  sendReceiptEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'mock-msg-123' }),
  sendVerificationForUser: jest.fn().mockResolvedValue('created'),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
}));

// In-memory mock database state for Supabase
const mockUsers = new Map();
const mockCampaigns = new Map();
const mockDonations = new Map();

// Mock Supabase client to support column projection and relational queries
jest.mock('../src/config/supabase', () => ({
  from: jest.fn((table) => {
    return {
      select: jest.fn((columns = '*') => ({
        eq: jest.fn((col, val) => ({
          single: jest.fn(async () => {
            if (table === 'users') {
              const u = Array.from(mockUsers.values()).find((x) => x[col] === val);
              if (!u) return { data: null, error: { message: 'Not found' } };
              const result = { ...u };
              if (columns !== '*') {
                const requestedCols = columns.split(',').map((c) => c.trim());
                for (const key of Object.keys(result)) {
                  if (!requestedCols.includes(key)) delete result[key];
                }
              }
              return { data: result, error: null };
            }
            if (table === 'campaigns') {
              const c = mockCampaigns.get(val);
              if (!c) return { data: null, error: { message: 'Not found' } };
              return { data: { ...c }, error: null };
            }
            if (table === 'donations') {
              const d = Array.from(mockDonations.values()).find((x) => x[col] === val);
              if (!d) return { data: null, error: { message: 'Not found' } };
              return { data: { ...d }, error: null };
            }
            return { data: null, error: null };
          }),
          maybeSingle: jest.fn(async () => {
            if (table === 'users') {
              const u = Array.from(mockUsers.values()).find((x) => x[col] === val);
              return { data: u ? { ...u } : null, error: null };
            }
            return { data: null, error: null };
          }),
        })),
      })),
      insert: jest.fn((dataToInsert) => ({
        select: jest.fn(() => ({
          single: jest.fn(async () => {
            const item = Array.isArray(dataToInsert) ? dataToInsert[0] : dataToInsert;
            const record = { id: `id_${Date.now()}_${Math.random()}`, ...item };
            if (table === 'donations') mockDonations.set(record.razorpay_order_id, record);
            return { data: record, error: null };
          }),
        })),
        single: jest.fn(async () => {
          const item = Array.isArray(dataToInsert) ? dataToInsert[0] : dataToInsert;
          const record = { id: `id_${Date.now()}_${Math.random()}`, ...item };
          if (table === 'donations') mockDonations.set(record.razorpay_order_id, record);
          return { data: record, error: null };
        }),
      })),
      update: jest.fn((updateData) => ({
        eq: jest.fn((col, val) => ({
          select: jest.fn(() => ({
            single: jest.fn(async () => {
              if (table === 'donations') {
                const existing = Array.from(mockDonations.values()).find((x) => x[col] === val);
                if (existing) {
                  Object.assign(existing, updateData);
                  return { data: existing, error: null };
                }
              }
              if (table === 'campaigns') {
                const existing = mockCampaigns.get(val);
                if (existing) {
                  Object.assign(existing, updateData);
                  return { data: existing, error: null };
                }
              }
              return { data: null, error: null };
            }),
          })),
        })),
      })),
    };
  }),
}));

const app = require('../src/index');
const emailController = require('../src/controllers/emailController');

describe('Issue #14 — API Integration Tests: Authentication & Donation Flows (NFR-10)', () => {
  const verifiedPassword = 'SecurePassword123!';
  const passwordHash = bcrypt.hashSync(verifiedPassword, 10);

  const testUser = {
    id: 'user-uuid-1111-2222',
    email: 'integration.donor@example.com',
    display_name: 'Integration Donor',
    password_hash: passwordHash,
    role: 'donor',
    is_verified: true,
    auth_version: 0,
  };

  const unverifiedUser = {
    id: 'user-uuid-3333-4444',
    email: 'unverified.donor@example.com',
    display_name: 'Unverified Donor',
    password_hash: passwordHash,
    role: 'donor',
    is_verified: false,
    auth_version: 0,
  };

  const activeCampaign = {
    id: 'camp-uuid-5555-6666',
    title: 'Clean Water for Rural Schools',
    description: 'Providing sustainable clean water filtration to 3 public schools.',
    goal_amount: 50000,
    raised_amount: 12000,
    category: 'Relief',
    status: 'active',
  };

  beforeEach(() => {
    mockUsers.clear();
    mockCampaigns.clear();
    mockDonations.clear();

    mockUsers.set(testUser.id, { ...testUser });
    mockUsers.set(unverifiedUser.id, { ...unverifiedUser });
    mockCampaigns.set(activeCampaign.id, { ...activeCampaign });

    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. AUTHENTICATION API INTEGRATION TESTS
  // =========================================================================
  describe('1. Authentication Flow Integration Tests (/api/auth)', () => {
    describe('POST /api/auth/login', () => {
      it('should log in successfully with valid credentials and return JWT expiring in 7 days', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'integration.donor@example.com',
            password: verifiedPassword,
          });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.user).toMatchObject({
          id: testUser.id,
          email: testUser.email,
          role: 'donor',
          display_name: testUser.display_name,
        });
        expect(res.body.user.password_hash).toBeUndefined();

        // Verify JWT token properties
        const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
        expect(decoded.id).toBe(testUser.id);
        expect(decoded.email).toBe(testUser.email);
        // Expiry should be exactly 7 days
        expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60);
      });

      it('should reject login with 401 when password does not match', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'integration.donor@example.com',
            password: 'WrongPassword!',
          });

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/invalid email or password/i);
      });

      it('should reject login with 401 when email does not exist in database', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: verifiedPassword,
          });

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/invalid email or password/i);
      });

      it('should reject login with 403 when user email is not yet verified', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'unverified.donor@example.com',
            password: verifiedPassword,
          });

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/verify your email/i);
      });

      it('should reject login with 400 when email or password is missing', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: 'integration.donor@example.com' });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/valid email and password are required/i);
      });

      it('should reject login with 400 when password exceeds 72 bytes limit', async () => {
        const longPassword = 'a'.repeat(73);
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'integration.donor@example.com',
            password: longPassword,
          });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/valid email and password are required/i);
      });
    });

    describe('GET /api/auth/me (Protected Route Validation)', () => {
      it('should return user profile without password_hash when valid Bearer token is provided', async () => {
        const token = jwt.sign(
          { id: testUser.id, email: testUser.email, role: 'donor', auth_version: 0 },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.user).toMatchObject({
          id: testUser.id,
          email: testUser.email,
          role: 'donor',
          display_name: testUser.display_name,
        });
        expect(res.body.user.password_hash).toBeUndefined();
      });

      it('should return 401 when Authorization header is missing', async () => {
        const res = await request(app).get('/api/auth/me');

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/no token provided/i);
      });

      it('should return 401 when token format is not Bearer', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Basic 123456');

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/no token provided/i);
      });

      it('should return 401 when token signature is invalid or forged', async () => {
        const forgedToken = jwt.sign(
          { id: testUser.id, email: testUser.email, role: 'donor' },
          'wrong-forged-secret-key-12345'
        );

        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${forgedToken}`);

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/token/i);
      });

      it('should return 401 when token is expired', async () => {
        const expiredToken = jwt.sign(
          { id: testUser.id, email: testUser.email, role: 'donor' },
          process.env.JWT_SECRET,
          { expiresIn: '-1s' }
        );

        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${expiredToken}`);

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/token expired or invalid/i);
      });
    });
  });

  // =========================================================================
  // 2. DONATION API INTEGRATION TESTS
  // =========================================================================
  describe('2. Donation Flow Integration Tests (/api/donations)', () => {
    let authToken;

    beforeEach(() => {
      authToken = jwt.sign(
        { id: testUser.id, email: testUser.email, role: 'donor', auth_version: 0 },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
    });

    describe('POST /api/donations/create-order', () => {
      it('should reject unauthenticated request with 401 Unauthorized', async () => {
        const res = await request(app)
          .post('/api/donations/create-order')
          .send({ amount: 100, campaign_id: activeCampaign.id });

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/no token provided/i);
      });

      it('should create order successfully for valid micro-donation within ₹1 to ₹500', async () => {
        const res = await request(app)
          .post('/api/donations/create-order')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            amount: 250,
            campaign_id: activeCampaign.id,
            is_anonymous: false,
          });

        expect(res.status).toBe(200);
        expect(res.body.order_id).toBeDefined();
        expect(res.body.amount).toBe(25000); // 250 * 100 paise
        expect(res.body.currency).toBe('INR');
        expect(res.body.key_id).toBe(process.env.RAZORPAY_KEY_ID);
      });

      it('should accept boundary minimum donation ₹1', async () => {
        const res = await request(app)
          .post('/api/donations/create-order')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ amount: 1, campaign_id: activeCampaign.id });

        expect(res.status).toBe(200);
        expect(res.body.amount).toBe(100); // ₹1 = 100 paise
      });

      it('should accept boundary maximum micro-donation ₹500', async () => {
        const res = await request(app)
          .post('/api/donations/create-order')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ amount: 500, campaign_id: activeCampaign.id });

        expect(res.status).toBe(200);
        expect(res.body.amount).toBe(50000); // ₹500 = 50000 paise
      });

      it('should accept anonymous micro-donation and record flag', async () => {
        const res = await request(app)
          .post('/api/donations/create-order')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            amount: 50,
            campaign_id: activeCampaign.id,
            is_anonymous: true,
          });

        expect(res.status).toBe(200);
        expect(res.body.order_id).toBeDefined();
      });

      it('should reject donation amount below ₹1 (e.g. ₹0) with 400', async () => {
        const res = await request(app)
          .post('/api/donations/create-order')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ amount: 0, campaign_id: activeCampaign.id });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/between ₹1 and ₹500/i);
      });

      it('should reject donation amount exceeding maximum micro-donation limit ₹500 (e.g. ₹501) with 400', async () => {
        const res = await request(app)
          .post('/api/donations/create-order')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ amount: 501, campaign_id: activeCampaign.id });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/between ₹1 and ₹500/i);
      });

      it('should reject negative donation amounts with 400', async () => {
        const res = await request(app)
          .post('/api/donations/create-order')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ amount: -50, campaign_id: activeCampaign.id });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/between ₹1 and ₹500/i);
      });

      it('should reject non-numeric amount with 400', async () => {
        const res = await request(app)
          .post('/api/donations/create-order')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ amount: 'invalid-amount', campaign_id: activeCampaign.id });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/between ₹1 and ₹500/i);
      });

      it('should reject request missing campaign_id with 400', async () => {
        const res = await request(app)
          .post('/api/donations/create-order')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ amount: 100 });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/campaign id is required/i);
      });
    });

    describe('POST /api/donations/verify', () => {
      it('should reject unauthenticated verification request with 401', async () => {
        const res = await request(app)
          .post('/api/donations/verify')
          .send({
            razorpay_order_id: 'order_12345',
            razorpay_payment_id: 'pay_67890',
            razorpay_signature: 'dev_test_sig',
          });

        expect(res.status).toBe(401);
      });

      it('should reject verification request when parameters are missing with 400', async () => {
        const res = await request(app)
          .post('/api/donations/verify')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ razorpay_order_id: 'order_12345' });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/missing payment verification parameters/i);
      });

      it('should reject verification when signature is invalid with 400', async () => {
        const res = await request(app)
          .post('/api/donations/verify')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            razorpay_order_id: 'order_fake_123',
            razorpay_payment_id: 'pay_fake_456',
            razorpay_signature: 'invalid_fraudulent_signature_value',
          });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/invalid payment signature/i);
      });

      it('should successfully verify payment with valid HMAC SHA-256 signature and trigger receipt email', async () => {
        const testOrderId = `order_${Date.now()}`;
        const testPaymentId = `pay_${Date.now()}`;

        // Compute genuine HMAC SHA-256 signature
        const expectedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
          .update(`${testOrderId}|${testPaymentId}`)
          .digest('hex');

        // Pre-insert pending donation record
        mockDonations.set(testOrderId, {
          id: 'don-uuid-1234',
          campaign_id: activeCampaign.id,
          donor_id: testUser.id,
          amount: 200,
          status: 'pending',
          razorpay_order_id: testOrderId,
        });

        const res = await request(app)
          .post('/api/donations/verify')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            razorpay_order_id: testOrderId,
            razorpay_payment_id: testPaymentId,
            razorpay_signature: expectedSignature,
            amount: 200,
            campaign_name: activeCampaign.title,
          });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.message).toMatch(/payment verified and donation completed/i);

        // Verify that emailController.sendReceiptEmail was called with donor info
        expect(emailController.sendReceiptEmail).toHaveBeenCalled();
        expect(emailController.sendReceiptEmail).toHaveBeenCalledWith(
          testUser.email,
          expect.objectContaining({
            amount: 200,
            transactionId: testPaymentId,
          })
        );
      });

      it('should support idempotency: repeated verification returns 200 without sending duplicate email', async () => {
        const idempotentOrderId = `order_idemp_${Date.now()}`;
        const idempotentPaymentId = `pay_idemp_${Date.now()}`;

        const validSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
          .update(`${idempotentOrderId}|${idempotentPaymentId}`)
          .digest('hex');

        mockDonations.set(idempotentOrderId, {
          id: 'don-uuid-idemp',
          campaign_id: activeCampaign.id,
          donor_id: testUser.id,
          amount: 150,
          status: 'pending',
          razorpay_order_id: idempotentOrderId,
        });

        // First verification call
        const firstRes = await request(app)
          .post('/api/donations/verify')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            razorpay_order_id: idempotentOrderId,
            razorpay_payment_id: idempotentPaymentId,
            razorpay_signature: validSignature,
            amount: 150,
          });

        expect(firstRes.status).toBe(200);
        expect(emailController.sendReceiptEmail).toHaveBeenCalledTimes(1);

        // Second verification call (duplicate / retry)
        const secondRes = await request(app)
          .post('/api/donations/verify')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            razorpay_order_id: idempotentOrderId,
            razorpay_payment_id: idempotentPaymentId,
            razorpay_signature: validSignature,
            amount: 150,
          });

        expect(secondRes.status).toBe(200);
        expect(secondRes.body.already_processed).toBe(true);
        // Email call count should still be 1 (no duplicate email sent)
        expect(emailController.sendReceiptEmail).toHaveBeenCalledTimes(1);
      });
    });
  });

  // =========================================================================
  // 3. COMBINED END-TO-END FLOW (AUTH -> ORDER -> PAYMENT -> VERIFY -> RECEIPT)
  // =========================================================================
  describe('3. Combined End-to-End Flow: Login -> Create Donation Order -> Verify Payment -> Receipt', () => {
    it('executes complete donor journey seamlessly from credentials to verified receipt', async () => {
      // Step A: Donor logs in
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'integration.donor@example.com',
          password: verifiedPassword,
        });

      expect(loginRes.status).toBe(200);
      const donorToken = loginRes.body.token;
      expect(donorToken).toBeDefined();

      // Step B: Donor checks authenticated session
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.email).toBe('integration.donor@example.com');
      expect(meRes.body.user.password_hash).toBeUndefined();

      // Step C: Donor creates a micro-donation order of ₹300
      const orderRes = await request(app)
        .post('/api/donations/create-order')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          amount: 300,
          campaign_id: activeCampaign.id,
          is_anonymous: false,
        });

      expect(orderRes.status).toBe(200);
      const orderId = orderRes.body.order_id;
      expect(orderId).toBeDefined();
      expect(orderRes.body.amount).toBe(30000); // 30000 paise = ₹300

      // Step D: Razorpay Checkout client succeeds and callback provides payment ID
      const paymentId = `pay_e2e_${Date.now()}`;
      const validHmacSig = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      // Step E: Client submits verification request
      const verifyRes = await request(app)
        .post('/api/donations/verify')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validHmacSig,
          amount: 300,
          campaign_name: activeCampaign.title,
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.status).toBe('ok');
      expect(verifyRes.body.message).toMatch(/donation completed/i);

      // Step F: Verification confirms receipt email was triggered for the donor
      expect(emailController.sendReceiptEmail).toHaveBeenCalledWith(
        'integration.donor@example.com',
        expect.objectContaining({
          amount: 300,
          transactionId: paymentId,
        })
      );
    });
  });
});
