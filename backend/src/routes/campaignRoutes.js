const express = require('express');
const campaignController = require('../controllers/campaignController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/categories', campaignController.getCategories);
router.get('/', campaignController.getCampaigns);
router.get('/:id', campaignController.getCampaignDetails);

// Protected routes
router.post('/', protect, upload.single('coverImage'), campaignController.createCampaign);
router.put('/:id', protect, upload.single('coverImage'), campaignController.updateCampaign);
router.delete('/:id', protect, campaignController.deleteCampaign);

router.post('/:id/updates', protect, campaignController.createUpdate);
router.post('/:id/comments', protect, campaignController.addComment);
router.delete('/comments/:commentId', protect, campaignController.deleteComment);
router.post('/:id/like', protect, campaignController.toggleLike);
router.post('/:id/bookmark', protect, campaignController.toggleBookmark);
router.post('/:id/share', protect, campaignController.shareCampaign);
router.post('/:id/report', protect, campaignController.reportCampaign);

module.exports = router;
