const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// GET /api/analytics - Six-month trend and category breakdown
router.get('/', analyticsController.getAnalytics);

module.exports = router;
