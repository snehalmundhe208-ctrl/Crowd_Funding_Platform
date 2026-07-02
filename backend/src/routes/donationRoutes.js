const express = require('express');
const donationController = require('../controllers/donationController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/leaderboard', donationController.getLeaderboard);

// Protected routes
router.post('/', protect, restrictTo('DONOR'), donationController.donate);
router.get('/history', protect, restrictTo('DONOR'), donationController.getMyDonationHistory);
router.get('/receipts/:receiptId/download', protect, donationController.downloadReceipt);
router.get('/certificates/:certificateId/download', protect, donationController.downloadCertificate);

module.exports = router;
