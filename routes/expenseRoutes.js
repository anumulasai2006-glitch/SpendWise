const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const expenseController = require('../controllers/expenseController');

// GET /api/expenses - List with search/filter
router.get('/', expenseController.getExpenses);

// POST /api/expenses - Add a manual expense
router.post(
  '/',
  [
    check('amount', 'Amount is required and must be a positive number').isFloat({ gt: 0 }),
    check('merchant', 'Merchant name is required').notEmpty().trim(),
    check('category', 'Category is required').notEmpty()
  ],
  expenseController.createExpense
);

// PUT /api/expenses/:id - Edit an expense
router.put('/:id', expenseController.updateExpense);

// DELETE /api/expenses/:id - Delete an expense
router.delete('/:id', expenseController.deleteExpense);

module.exports = router;
