
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');

const {
  getCampaigns,
  getCampaignById,
  getCampaignDonations,
  createCampaign,
  uploadCampaignFile,
  postUpdate,
  getCampaignStats,
} = require('../controllers/campaignController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'application/pdf',
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, and PDF files are allowed'));
    }

    cb(null, true);
  },
});

const handleCampaignUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'File size must not exceed 5MB',
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
router.get('/:id', getCampaignById);
router.get('/:id/donations', getCampaignDonations);
router.get('/:id/stats', authenticate, getCampaignStats);
router.post('/', authenticate, createCampaign);
router.post(
  '/:id/upload',
  authenticate,
  handleCampaignUpload,
  uploadCampaignFile
);
router.post('/:id/updates', authenticate, postUpdate);

module.exports = router;

