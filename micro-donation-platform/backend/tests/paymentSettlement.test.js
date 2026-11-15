// Tests for src/services/paymentSettlement.js
// We inject a mock `database` so no real Supabase calls are made.

// Mock supabase so the module loads without needing real credentials
jest.mock('../src/config/supabase', () => ({ rpc: jest.fn() }));

const { settleCapturedDonation } = require('../src/services/paymentSettlement');

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Build a fake Supabase-like client whose .rpc() resolves with given data/error */
function makeDb({ data = null, error = null } = {}) {
  return {
    rpc: jest.fn().mockResolvedValue({ data, error }),
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('settleCapturedDonation — paymentSettlement service', () => {

  test('calls settle_campaign_payment RPC with correct arguments', async () => {
    const db = makeDb({ data: { result: 'completed', credited: true } });

    await settleCapturedDonation({
      orderId: 'order_123',
      paymentId: 'pay_abc',
      donorId: 'user-456',
      database: db,
    });

    expect(db.rpc).toHaveBeenCalledWith('settle_campaign_payment', {
      p_order_id: 'order_123',
      p_payment_id: 'pay_abc',
      p_donor_id: 'user-456',
    });
  });

  test('returns data when RPC succeeds with result = completed', async () => {
    const db = makeDb({ data: { result: 'completed', credited: true } });

    const result = await settleCapturedDonation({
      orderId: 'order_123',
      paymentId: 'pay_abc',
      database: db,
    });

    expect(result).toEqual({ result: 'completed', credited: true });
  });

  test('returns data when RPC succeeds with result = already_completed', async () => {
    const db = makeDb({ data: { result: 'already_completed', credited: false } });

    const result = await settleCapturedDonation({
      orderId: 'order_dup',
      paymentId: 'pay_dup',
      database: db,
    });

    expect(result).toEqual({ result: 'already_completed', credited: false });
  });

  test('throws an error when RPC returns an error', async () => {
    const db = makeDb({ data: null, error: { message: 'DB failure' } });

    await expect(
      settleCapturedDonation({ orderId: 'order_x', paymentId: 'pay_x', database: db })
    ).rejects.toThrow('Payment reconciliation unavailable');
  });

  test('throws an error when RPC returns null data', async () => {
    const db = makeDb({ data: null, error: null });

    await expect(
      settleCapturedDonation({ orderId: 'order_null', paymentId: 'pay_null', database: db })
    ).rejects.toThrow('Payment reconciliation unavailable');
  });

  test('uses null as default donorId when not provided', async () => {
    const db = makeDb({ data: { result: 'completed', credited: true } });

    await settleCapturedDonation({
      orderId: 'order_anon',
      paymentId: 'pay_anon',
      database: db,
    });

    expect(db.rpc).toHaveBeenCalledWith('settle_campaign_payment', {
      p_order_id: 'order_anon',
      p_payment_id: 'pay_anon',
      p_donor_id: null,
    });
  });

  test('returns result = missing when campaign is not found', async () => {
    const db = makeDb({ data: { result: 'missing' } });

    const result = await settleCapturedDonation({
      orderId: 'order_missing',
      paymentId: 'pay_missing',
      database: db,
    });

    expect(result.result).toBe('missing');
  });

  test('returns result = forbidden when donor does not match', async () => {
    const db = makeDb({ data: { result: 'forbidden' } });

    const result = await settleCapturedDonation({
      orderId: 'order_forbidden',
      paymentId: 'pay_forbidden',
      donorId: 'wrong-user',
      database: db,
    });

    expect(result.result).toBe('forbidden');
  });
});
