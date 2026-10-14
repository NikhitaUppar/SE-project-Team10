const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  getCampaigns,
  getCampaignById,
  createCampaign,
  uploadCampaignFile,
  postUpdate,
  getCampaignStats,
} = require('../controllers/campaignController');

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.get('/', getCampaigns);
router.get('/:id', getCampaignById);
router.get('/:id/stats', authenticate, getCampaignStats);
router.post('/', authenticate, createCampaign);
router.post('/:id/upload', authenticate, upload.single('file'), uploadCampaignFile);
router.post('/:id/updates', authenticate, postUpdate);

module.exports = router;
