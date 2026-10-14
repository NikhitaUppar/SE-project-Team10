const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getMyDonations } = require('../controllers/userController');

router.get('/me/donations', authenticate, getMyDonations);

module.exports = router;
