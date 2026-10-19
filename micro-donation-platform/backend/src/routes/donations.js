const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  createOrder,
  verifyPayment,
  verifyWebhook,
} = require('../controllers/donationController');

router.post('/create-order', authenticate, createOrder);
router.post('/verify', authenticate, verifyPayment);
router.post('/webhook', verifyWebhook); // no auth — Razorpay calls this

module.exports = router;
