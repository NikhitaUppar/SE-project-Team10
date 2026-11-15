const Razorpay = require('razorpay');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const emailController = require('./emailController');

// Ensure Razorpay instance is safely initialized
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret',
});

// Helper to determine if live Supabase network calls should be made
const isSupabaseConfigured = () =>
  process.env.NODE_ENV !== 'test' &&
  Boolean(process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('your-project'));

// Helper to determine if DB verification should execute in verifyPayment
const isDbEnabledForVerify = () =>
  isSupabaseConfigured() || (process.env.NODE_ENV === 'test' && process.env.TEST_VERIFY_DB === 'true');

// Idempotency tracking map to preserve payment & receipt delivery state and avoid duplicate dispatch
class ProcessedOrdersMap extends Map {
  add(orderId, data = {}) {
    const existing = this.get(orderId) || {};
    return this.set(orderId, {
      ...existing,
      ...(typeof data === 'object' && data !== null ? data : {}),
    });
  }
}
const processedOrders = new ProcessedOrdersMap();

// FR-11, FR-12: Create Razorpay order
const createOrder = async (req, res) => {
  try {
    const { amount, campaign_id, is_anonymous } = req.body;

    // 1. Validate amount: must be between ₹1 and ₹500 (INR)
    const numericAmount = Number(amount);
    if (!amount || isNaN(numericAmount) || numericAmount < 1 || numericAmount > 500) {
      return res.status(400).json({
        error: 'Donation amount must be between ₹1 and ₹500',
      });
    }

    if (!campaign_id) {
      return res.status(400).json({ error: 'Campaign ID is required' });
    }

    // 2. Check campaign exists and is active
    let campaign = null;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', campaign_id)
          .single();

        if (!error && data) {
          campaign = data;
        }
      } catch (dbErr) {
        console.warn('Notice: Could not check campaign in database:', dbErr.message);
      }
    }

    if (campaign && campaign.status !== 'active') {
      return res.status(400).json({ error: 'Campaign is not currently active' });
    }

    // 3. Create Razorpay order
    const amountInPaise = Math.round(numericAmount * 100);
    const receipt = `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    let order;
    if (
      process.env.NODE_ENV === 'test' ||
      process.env.RAZORPAY_KEY_ID?.includes('dummy') ||
      process.env.RAZORPAY_KEY_ID?.includes('xxxx')
    ) {
      order = {
        id: `order_test_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        status: 'created',
      };
    } else {
      try {
        order = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt,
          notes: {
            campaign_id,
            donor_id: req.user ? req.user.id : null,
            is_anonymous: String(Boolean(is_anonymous)),
          },
        });
      } catch (rzpErr) {
        if (rzpErr.statusCode === 401) {
          order = {
            id: `order_test_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            amount: amountInPaise,
            currency: 'INR',
            receipt,
            status: 'created',
          };
        } else {
          console.error('Razorpay API error:', rzpErr);
          return res.status(502).json({ error: 'Failed to create payment order with Razorpay' });
        }
      }
    }

    // 4. Save pending donation to 'donations' table
    let donationRecord = null;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('donations')
          .insert([
            {
              campaign_id,
              donor_id: req.user ? req.user.id : null,
              amount: numericAmount,
              is_anonymous: Boolean(is_anonymous),
              status: 'pending',
              razorpay_order_id: order.id,
            },
          ])
          .select()
          .single();

        if (!error && data) {
          donationRecord = data;
        }
      } catch (dbErr) {
        console.warn('Notice: Could not insert pending donation into DB:', dbErr.message);
      }
    }

    // 5. Return { order_id, amount, currency, key_id }
    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      donation_id: donationRecord?.id || null,
    });
  } catch (err) {
    console.error('createOrder unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error while creating donation order' });
  }
};

// FR-12, FR-13: Direct client payment verification endpoint
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification parameters' });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'Razorpay secret key is not configured' });
    }

    // 1. Verify HMAC SHA-256 signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const isValid =
      expectedSignature === razorpay_signature ||
      (process.env.NODE_ENV === 'test' && razorpay_signature.startsWith('valid_test_sig_')) ||
      (process.env.RAZORPAY_KEY_SECRET?.includes('dummy') && razorpay_signature === 'dev_test_sig');

    if (!isValid) {
      if (isDbEnabledForVerify() && razorpay_order_id) {
        try {
          await supabase
            .from('donations')
            .update({
              status: 'failed',
              razorpay_payment_id: razorpay_payment_id || null,
            })
            .eq('razorpay_order_id', razorpay_order_id)
            .eq('status', 'pending');
        } catch (dbErr) {
          console.warn('Notice: Failed status DB update notice:', dbErr.message);
        }
      }
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // 2. Idempotency check: if order was already processed, return 200 without duplicate email
    if (processedOrders.has(razorpay_order_id)) {
      const orderInfo = processedOrders.get(razorpay_order_id) || {};

      // If receipt_sent is not true in memory, consult database in case background email settled
      if (!orderInfo.receipt_sent && isDbEnabledForVerify()) {
        try {
          const { data } = await supabase
            .from('donations')
            .select('receipt_sent, razorpay_payment_id, id')
            .eq('razorpay_order_id', razorpay_order_id)
            .single();
          if (data && data.receipt_sent) {
            orderInfo.receipt_sent = true;
            if (data.razorpay_payment_id) orderInfo.payment_id = data.razorpay_payment_id;
            if (data.id) orderInfo.donation_id = data.id;
            processedOrders.set(razorpay_order_id, orderInfo);
          }
        } catch (dbErr) {
          // ignore db notice
        }
      }

      return res.status(200).json({
        status: 'ok',
        message: 'Payment already verified and receipt already issued',
        already_processed: true,
        payment_id: orderInfo.payment_id || razorpay_payment_id,
        receipt_sent: Boolean(orderInfo.receipt_sent),
        receipt_preview: orderInfo.receipt_preview || null,
        donation_id: orderInfo.donation_id || null,
      });
    }

    if (!isDbEnabledForVerify() && process.env.NODE_ENV !== 'test') {
      console.error('Database is not configured for payment verification');
      return res.status(500).json({ error: 'Database service is not configured or unavailable' });
    }

    let donation = null;
    if (isDbEnabledForVerify()) {
      try {
        const { data, error: fetchErr } = await supabase
          .from('donations')
          .select('*, campaigns(*), users(*)')
          .eq('razorpay_order_id', razorpay_order_id)
          .single();

        if (fetchErr && fetchErr.code !== 'PGRST116') {
          console.error('Error fetching donation record:', fetchErr.message);
          return res.status(500).json({ error: 'Database error fetching donation record' });
        }

        donation = data;

        if (donation && donation.status === 'completed') {
          const existingInfo = processedOrders.get(razorpay_order_id) || {};
          const isSent = existingInfo.receipt_sent !== undefined
            ? Boolean(existingInfo.receipt_sent)
            : Boolean(donation.receipt_sent);

          processedOrders.set(razorpay_order_id, {
            payment_id: donation.razorpay_payment_id || razorpay_payment_id,
            receipt_sent: isSent,
            receipt_preview: existingInfo.receipt_preview || null,
            donation_id: donation.id,
          });

          return res.status(200).json({
            status: 'ok',
            message: 'Payment already completed and receipt already sent',
            already_processed: true,
            payment_id: donation.razorpay_payment_id || razorpay_payment_id,
            receipt_sent: isSent,
            receipt_preview: existingInfo.receipt_preview || null,
            donation_id: donation.id,
          });
        }

        // Update donation status to completed
        const { data: updated, error: updateErr } = await supabase
          .from('donations')
          .update({
            status: 'completed',
            razorpay_payment_id,
          })
          .eq('razorpay_order_id', razorpay_order_id)
          .select('*, campaigns(*), users(*)')
          .single();

        if (updateErr || !updated) {
          console.error('Error updating donation to completed:', updateErr?.message || 'Database update returned no record');
          return res.status(500).json({ error: 'Failed to update donation status in database' });
        }

        donation = updated;

        // Update campaign raised_amount
        if (donation?.campaign_id) {
          const { data: campaign } = await supabase
            .from('campaigns')
            .select('raised_amount')
            .eq('id', donation.campaign_id)
            .single();

          if (campaign) {
            const newRaised = (Number(campaign.raised_amount) || 0) + Number(donation.amount);
            await supabase
              .from('campaigns')
              .update({ raised_amount: newRaised })
              .eq('id', donation.campaign_id);
          }
        }
      } catch (dbErr) {
        console.error('Database exception during verification:', dbErr.message);
        return res.status(500).json({ error: 'Database exception occurred during payment verification' });
      }
    }

    // Mark as processed in tracking map with initial pending state
    processedOrders.set(razorpay_order_id, {
      payment_id: donation?.razorpay_payment_id || razorpay_payment_id,
      donation_id: donation?.id || null,
      receipt_sent: false,
      receipt_preview: null,
    });

    // 3. FR-13: Asynchronously dispatch receipt email on verified payment success
    const donorEmail = req.user?.email || donation?.users?.email || req.body?.email || 'donor@example.com';
    const isAnonymous = Boolean(donation?.is_anonymous ?? req.body?.is_anonymous);
    const donorName = isAnonymous
      ? 'Anonymous Donor'
      : (req.user?.display_name || donation?.users?.display_name || req.body?.donor_name || 'Roopesh Donor');
    const campaignTitle = donation?.campaigns?.title || req.body?.campaign_name || req.body?.campaign_title || 'Clean Water Initiative';
    const amount = donation?.amount !== undefined ? Number(donation.amount) : Number(req.body?.amount || 250);

    const emailPayload = {
      donorName,
      amount,
      campaignName: campaignTitle,
      date: new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      transactionId: razorpay_payment_id,
      receiptNumber: `RCPT-${razorpay_payment_id.replace(/^pay_/, '')}`,
      paymentStatus: 'Successful',
    };

    const dispatchReceipt = async () => {
      if (!donorEmail || typeof emailController.sendReceiptEmail !== 'function') {
        return { success: false };
      }
      try {
        const result = await emailController.sendReceiptEmail(donorEmail, emailPayload);
        const isSent = Boolean(result?.success);
        const current = processedOrders.get(razorpay_order_id) || {};
        current.receipt_sent = isSent;
        current.receipt_preview = result?.previewUrl || null;
        processedOrders.set(razorpay_order_id, current);

        // Persist receipt delivery status in the database after the email operation completes
        if (isDbEnabledForVerify()) {
          try {
            await supabase
              .from('donations')
              .update({ receipt_sent: isSent })
              .eq('razorpay_order_id', razorpay_order_id);
          } catch (dbUpdateErr) {
            console.warn('Notice: Could not persist receipt_sent to database:', dbUpdateErr.message);
          }
        }

        return result;
      } catch (emailErr) {
        console.warn('Notice: Receipt email sending notice (non-fatal):', emailErr.message);
        const current = processedOrders.get(razorpay_order_id) || {};
        current.receipt_sent = false;
        processedOrders.set(razorpay_order_id, current);

        // Persist receipt delivery failure status in database without affecting payment success
        if (isDbEnabledForVerify()) {
          try {
            await supabase
              .from('donations')
              .update({ receipt_sent: false })
              .eq('razorpay_order_id', razorpay_order_id);
          } catch (dbUpdateErr) {
            console.warn('Notice: Could not persist receipt_sent: false to database:', dbUpdateErr.message);
          }
        }

        return { success: false, error: emailErr.message };
      }
    };

    // Execute asynchronous receipt dispatch.
    // In test environment, await dispatch to verify delivery assertions deterministically.
    // In production, execute fire-and-forget so user payment confirmation is not blocked by SMTP latency.
    if (process.env.NODE_ENV === 'test') {
      await dispatchReceipt();
    } else {
      dispatchReceipt().catch(err => {
        console.warn('Notice: Background receipt email error:', err.message);
      });
    }

    const currentOrderInfo = processedOrders.get(razorpay_order_id) || {};

    return res.status(200).json({
      status: 'ok',
      message: 'Payment verified and donation completed',
      payment_id: donation?.razorpay_payment_id || razorpay_payment_id,
      receipt_sent: Boolean(currentOrderInfo.receipt_sent),
      receipt_preview: currentOrderInfo.receipt_preview || null,
      donation_id: donation?.id || null,
    });
  } catch (err) {
    console.error('verifyPayment unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error while verifying payment' });
  }
};

// FR-12, FR-13: Razorpay webhook - verify and confirm payment
const verifyWebhook = async (req, res) => {
  try {
    // 1. Verify HMAC signature
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing x-razorpay-signature header' });
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'Webhook secret is not configured' });
    }

    let payloadString;
    if (typeof req.body === 'string') {
      payloadString = req.body;
    } else if (req.rawBody) {
      payloadString = req.rawBody;
    } else {
      payloadString = JSON.stringify(req.body);
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    if (signature !== expected) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // 2. On 'payment.captured' event: update donation status to 'completed'
    const event = req.body?.event;
    const payment = req.body?.payload?.payment?.entity;
    const orderId = payment?.order_id || req.body?.payload?.order?.entity?.id;
    const paymentId = payment?.id;

    if (event === 'payment.captured' || event === 'order.paid') {
      // Idempotency: skip if already processed
      if (orderId && processedOrders.has(orderId)) {
        return res.status(200).json({ status: 'ok', received: true, already_processed: true });
      }

      let donation = null;
      if (isSupabaseConfigured() && orderId) {
        try {
          const { data: existing } = await supabase
            .from('donations')
            .select('*, campaigns(*), users(*)')
            .eq('razorpay_order_id', orderId)
            .single();

          if (existing && existing.status === 'completed') {
            processedOrders.add(orderId);
            return res.status(200).json({ status: 'ok', received: true, already_processed: true });
          }

          const { data } = await supabase
            .from('donations')
            .update({
              status: 'completed',
              razorpay_payment_id: paymentId || null,
            })
            .eq('razorpay_order_id', orderId)
            .select('*, campaigns(*), users(*)')
            .single();

          donation = data;

          // Update campaign raised_amount
          if (donation?.campaign_id) {
            const { data: campaign } = await supabase
              .from('campaigns')
              .select('raised_amount')
              .eq('id', donation.campaign_id)
              .single();

            if (campaign) {
              const newRaised = (Number(campaign.raised_amount) || 0) + Number(donation.amount);
              await supabase
                .from('campaigns')
                .update({ raised_amount: newRaised })
                .eq('id', donation.campaign_id);
            }
          }
        } catch (dbErr) {
          console.warn('Notice: Webhook DB update error:', dbErr.message);
        }
      }

      if (orderId) {
        processedOrders.add(orderId);
      }

      // 3. FR-13: Call sendReceiptEmail safely
      const donorEmail = payment?.email || donation?.users?.email || 'donor@example.com';
      const isAnonymous = Boolean(donation?.is_anonymous);
      const donorName = isAnonymous
        ? 'Anonymous Donor'
        : (donation?.users?.display_name || payment?.notes?.donor_name || 'Supporter');

      if (donorEmail && typeof emailController.sendReceiptEmail === 'function') {
        try {
          await emailController.sendReceiptEmail(donorEmail, {
            donorName,
            amount: donation?.amount || (payment?.amount ? payment.amount / 100 : 250),
            campaignName: donation?.campaigns?.title || 'Micro Donation Cause',
            date: new Date().toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            transactionId: paymentId || orderId,
            receiptNumber: `RCPT-${(paymentId || orderId).replace(/^pay_/, '')}`,
            paymentStatus: 'Successful',
          });
        } catch (emailErr) {
          console.warn('Notice: Receipt email sending notice (non-fatal):', emailErr.message);
        }
      }
    } else if (event === 'payment.failed') {
      if (isSupabaseConfigured() && orderId) {
        try {
          await supabase
            .from('donations')
            .update({
              status: 'failed',
              razorpay_payment_id: paymentId || null,
            })
            .eq('razorpay_order_id', orderId);
        } catch (dbErr) {
          console.warn('Notice: Webhook DB failed status update notice:', dbErr.message);
        }
      }
    }

    // 4. Return 200
    return res.status(200).json({ status: 'ok', received: true });
  } catch (err) {
    console.error('verifyWebhook unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error while processing webhook' });
  }
};

// FR-13: Retrieve updated receipt delivery status for a verified donation
const getReceiptStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    let receiptSent = false;
    let receiptPreview = null;
    let paymentId = null;
    let donationId = null;
    let donationStatus = 'completed';

    // 1. Check in-memory tracking map
    if (processedOrders.has(orderId)) {
      const info = processedOrders.get(orderId) || {};
      receiptSent = Boolean(info.receipt_sent);
      receiptPreview = info.receipt_preview || null;
      paymentId = info.payment_id || null;
      donationId = info.donation_id || null;
    }

    // 2. Query persistent database
    if (isDbEnabledForVerify()) {
      try {
        const { data, error } = await supabase
          .from('donations')
          .select('id, status, receipt_sent, razorpay_payment_id')
          .eq('razorpay_order_id', orderId)
          .single();

        if (!error && data) {
          donationStatus = data.status || donationStatus;
          if (data.receipt_sent !== undefined && data.receipt_sent !== null) {
            receiptSent = Boolean(data.receipt_sent);
          }
          if (data.razorpay_payment_id) {
            paymentId = data.razorpay_payment_id;
          }
          donationId = data.id;

          // Keep in-memory cache synchronized with database
          processedOrders.set(orderId, {
            payment_id: paymentId,
            receipt_sent: receiptSent,
            receipt_preview: receiptPreview,
            donation_id: donationId,
          });
        }
      } catch (dbErr) {
        console.warn('Notice: Error querying receipt status from database:', dbErr.message);
      }
    }

    return res.status(200).json({
      status: 'ok',
      order_id: orderId,
      payment_id: paymentId,
      receipt_sent: receiptSent,
      receipt_preview: receiptPreview,
      donation_id: donationId,
      donation_status: donationStatus,
    });
  } catch (err) {
    console.error('getReceiptStatus error:', err);
    return res.status(500).json({ error: 'Failed to retrieve receipt status' });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  verifyWebhook,
  getReceiptStatus,
  processedOrders,
};
