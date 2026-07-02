const express = require('express');
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.post('/kyc/submit', restrictTo('CREATOR'), upload.single('kycDocument'), userController.submitKyc);
router.post('/creator/:creatorId/follow', userController.followCreator);
router.delete('/creator/:creatorId/unfollow', userController.unfollowCreator);
router.get('/dashboard', userController.getDashboardMetrics);
router.get('/kyc/:kycId/document', userController.getKycDocument);
router.get('/notifications', userController.getNotifications);
router.put('/notifications/:notificationId/read', userController.markNotificationRead);

module.exports = router;
