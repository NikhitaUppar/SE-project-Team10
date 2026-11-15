const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  createOrder,
  verifyPayment,
  verifyWebhook,
  getReceiptStatus,
} = require('../controllers/donationController');

router.post('/create-order', authenticate, createOrder);
router.post('/verify', authenticate, verifyPayment);
router.get('/receipt-status/:orderId', authenticate, getReceiptStatus);
router.get('/:orderId/receipt-status', authenticate, getReceiptStatus);
router.post('/webhook', verifyWebhook); // no auth — Razorpay calls this

module.exports = router;
