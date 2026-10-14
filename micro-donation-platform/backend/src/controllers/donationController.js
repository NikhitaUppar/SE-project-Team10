const Razorpay = require('razorpay');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const { sendReceiptEmail } = require('./emailController');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// FR-11, FR-12: Create Razorpay order
const createOrder = async (req, res) => {
  // TODO (roopeshp057-a11y): Implement
  // 1. Validate amount: must be between 1 and 500 (INR)
  // 2. Check campaign exists and is active
  // 3. Create Razorpay order: razorpay.orders.create({ amount: amount*100, currency: 'INR' })
  // 4. Save pending donation to 'donations' table
  // 5. Return { order_id, amount, currency, key_id }
  res.status(501).json({ error: 'Not implemented yet' });
};

// FR-12: Razorpay webhook — verify and confirm payment
const verifyWebhook = async (req, res) => {
  // TODO (roopeshp057-a11y): Implement
  // 1. Verify HMAC signature:
  //    const signature = req.headers['x-razorpay-signature']
  //    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  //                           .update(JSON.stringify(req.body)).digest('hex')
  //    if (signature !== expected) return res.status(400).json({ error: 'Invalid signature' })
  // 2. On 'payment.captured' event: update donation status to 'completed'
  // 3. Call sendReceiptEmail(donor_email, donation_details)
  // 4. Return 200
  res.status(501).json({ error: 'Not implemented yet' });
};

module.exports = { createOrder, verifyWebhook };
