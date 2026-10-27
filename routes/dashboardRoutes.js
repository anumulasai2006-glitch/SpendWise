const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// GET /api/dashboard - Monthly totals, budget usage, recent entries, insights
router.get('/', dashboardController.getDashboard);

module.exports = router;
