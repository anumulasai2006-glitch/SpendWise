const mongoose = require('mongoose');
const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const memoryStore = require('../services/memoryStore');

exports.getBudget = async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year = parseInt(req.query.year) || now.getFullYear();

    if (mongoose.connection.readyState === 1) {
      const budgetDoc = await Budget.findOne({ month, year });
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

      const expenses = await Expense.find({
        date: { $gte: startOfMonth, $lte: endOfMonth },
        txnType: 'debit'
      });

      const totalSpent = expenses.reduce((sum, e) => sum + (e.userShare || e.amount), 0);
      const budgetAmount = budgetDoc ? budgetDoc.amount : 0;
      const remaining = Math.max(0, budgetAmount - totalSpent);
      const percentage = budgetAmount > 0 ? parseFloat(((totalSpent / budgetAmount) * 100).toFixed(1)) : 0;

      let status = 'ok';
      if (budgetAmount > 0) {
        if (percentage >= 100) status = 'exceeded';
        else if (percentage >= 80) status = 'warning';
      }

      return res.json({
        success: true,
        data: {
          budget: budgetDoc,
          month,
          year,
          amount: budgetAmount,
          totalSpent,
          remaining: budgetAmount > 0 ? (budgetAmount - totalSpent) : 0,
          percentage,
          status,
          notes: budgetDoc ? budgetDoc.notes : ''
        }
      });
    }

    // Memory Store Fallback
    const budgetDoc = memoryStore.getBudget(month, year);
    const expenses = memoryStore.getExpenses().filter(e => {
      const d = new Date(e.date);
      return (d.getMonth() + 1) === month && d.getFullYear() === year && e.txnType === 'debit';
    });
    const totalSpent = expenses.reduce((sum, e) => sum + (e.userShare || e.amount), 0);
    const budgetAmount = budgetDoc ? budgetDoc.amount : 0;
    const remaining = Math.max(0, budgetAmount - totalSpent);
    const percentage = budgetAmount > 0 ? parseFloat(((totalSpent / budgetAmount) * 100).toFixed(1)) : 0;

    res.json({
      success: true,
      data: {
        budget: budgetDoc,
        month,
        year,
        amount: budgetAmount,
        totalSpent,
        remaining: budgetAmount > 0 ? (budgetAmount - totalSpent) : 0,
        percentage,
        status: budgetAmount === 0 ? 'unset' : (percentage >= 100 ? 'exceeded' : (percentage >= 80 ? 'warning' : 'ok')),
        notes: budgetDoc ? budgetDoc.notes : ''
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.setBudget = async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.body.month) || (now.getMonth() + 1);
    const year = parseInt(req.body.year) || now.getFullYear();
    const amount = Number(req.body.amount);
    const notes = req.body.notes || '';

    if (isNaN(amount) || amount < 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid non-negative budget amount'
      });
    }

    if (mongoose.connection.readyState === 1) {
      const budget = await Budget.findOneAndUpdate(
        { month, year },
        { amount, notes },
        { upsert: true, new: true, runValidators: true }
      );
      return res.json({
        success: true,
        message: `Budget of ₹${amount} set successfully for ${month}/${year}`,
        data: budget
      });
    }

    const saved = memoryStore.setBudget(month, year, amount, notes);
    res.json({
      success: true,
      message: `Budget of ₹${amount} set successfully for ${month}/${year}`,
      data: saved
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
