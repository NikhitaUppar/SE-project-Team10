const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
  getPendingCampaigns,
  approveCampaign,
  rejectCampaign,
  getMetrics,
} = require('../controllers/adminController');
const { verifyCampaign } = require('../controllers/campaignController');

router.use(authenticate, requireRole('admin'));

router.get('/campaigns', getPendingCampaigns);
router.patch('/campaigns/:id/approve', approveCampaign);
router.patch('/campaigns/:id/reject', rejectCampaign);
router.patch('/campaigns/:id/verify', verifyCampaign);
router.get('/metrics', getMetrics);

module.exports = router;
