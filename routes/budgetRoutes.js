const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');

// GET /api/budget - Read the current month's budget
router.get('/', budgetController.getBudget);

// PUT /api/budget - Set or update the current month's budget
router.put('/', budgetController.setBudget);

module.exports = router;
