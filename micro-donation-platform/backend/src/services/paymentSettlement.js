const supabase = require('../config/supabase');

// The database transaction serializes concurrent verify/webhook deliveries with
// campaign closure. Never fall back to read/modify/write accounting on RPC errors.
async function settleCapturedDonation({ orderId, paymentId, donorId = null, database = supabase }) {
  const { data, error } = await database.rpc('settle_campaign_payment', {
    p_order_id: orderId, p_payment_id: paymentId, p_donor_id: donorId,
  });
  if (error || !data) throw new Error('Payment reconciliation unavailable');
  return data;
}

module.exports = { settleCapturedDonation };
