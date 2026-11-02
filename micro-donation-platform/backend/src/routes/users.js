const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getMyDonations, getMyCampaigns } = require('../controllers/userController');

router.get('/me/donations', authenticate, getMyDonations);
router.get('/me/campaigns', authenticate, getMyCampaigns);

module.exports = router;
