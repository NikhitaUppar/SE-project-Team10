const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  createOrder,
  verifyWebhook,
} = require('../controllers/donationController');

router.post('/create-order', authenticate, createOrder);
router.post('/webhook', verifyWebhook); // no auth — Razorpay calls this

module.exports = router;
