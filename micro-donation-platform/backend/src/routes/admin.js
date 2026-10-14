const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
  getPendingCampaigns,
  approveCampaign,
  rejectCampaign,
  getMetrics,
} = require('../controllers/adminController');

router.use(authenticate, requireRole('admin'));

router.get('/campaigns', getPendingCampaigns);
router.patch('/campaigns/:id/approve', approveCampaign);
router.patch('/campaigns/:id/reject', rejectCampaign);
router.get('/metrics', getMetrics);

module.exports = router;
