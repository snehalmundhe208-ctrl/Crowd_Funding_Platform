const express = require('express');
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// All routes here are restricted to ADMIN role only
router.use(protect, restrictTo('ADMIN'));

router.get('/stats', adminController.getAdminDashboardStats);
router.put('/kyc/:kycId/review', adminController.reviewKyc);
router.put('/campaigns/:campaignId/review', adminController.reviewCampaign);
router.put('/reports/:reportId/review', adminController.handleReport);
router.put('/users/:userId/suspend', adminController.toggleUserSuspension);
router.get('/logs', adminController.getAdminLogs);

module.exports = router;
