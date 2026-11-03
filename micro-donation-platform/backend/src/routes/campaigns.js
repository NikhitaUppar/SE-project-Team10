
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, requireRole } = require('../middleware/auth');

const {
  getCampaigns,
  getCampaignById,
  getCampaignDonations,
  createCampaign,
  uploadCampaignFile,
  postUpdate,
  getCampaignUpdates,
  getCampaignStats,
  getPublicStats,
} = require('../controllers/campaignController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, PDF, MP4, WebM, and MOV files are allowed'));
    }

    cb(null, true);
  },
});

const handleCampaignUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'File size must not exceed 50MB',
        });
      }

      return res.status(400).json({
        error: 'File upload failed',
      });
    }

    if (err) {
      return res.status(400).json({
        error: err.message || 'Invalid file',
      });
    }

    next();
  });
};

router.get('/', getCampaigns);
router.get('/public-stats', getPublicStats); // must be before /:id
router.get('/:id', getCampaignById);
router.get('/:id/updates', getCampaignUpdates);
router.get('/:id/donations', getCampaignDonations);
router.get('/:id/stats', authenticate, getCampaignStats);
router.post('/', authenticate, createCampaign);
router.post(
  '/:id/upload',
  authenticate,
  handleCampaignUpload,
  uploadCampaignFile
);
router.post('/:id/updates', authenticate, requireRole('campaign_owner'), postUpdate);

module.exports = router;

