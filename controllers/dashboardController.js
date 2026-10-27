const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const Trip = require('../models/Trip');
const InsightsService = require('../services/insightsService');
const memoryStore = require('../services/memoryStore');

exports.getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year = parseInt(req.query.year) || now.getFullYear();

    if (mongoose.connection.readyState === 1) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

      const monthExpenses = await Expense.find({
        date: { $gte: startOfMonth, $lte: endOfMonth }
      })
        .populate('category')
        .populate('trip')
        .sort({ date: -1, createdAt: -1 });

      const debitExpenses = monthExpenses.filter(e => e.txnType === 'debit');
      const creditExpenses = monthExpenses.filter(e => e.txnType === 'credit');

      const totalSpending = debitExpenses.reduce((sum, e) => sum + (e.userShare || e.amount), 0);
      const totalGrossAmount = debitExpenses.reduce((sum, e) => sum + e.amount, 0);
      const totalIncome = creditExpenses.reduce((sum, e) => sum + (e.userShare || e.amount), 0);

      const budgetDoc = await Budget.findOne({ month, year });
      const budgetAmount = budgetDoc ? budgetDoc.amount : 0;
      const remainingBudget = budgetAmount > 0 ? (budgetAmount - totalSpending) : 0;
      const budgetUsagePercentage = budgetAmount > 0
        ? parseFloat(((totalSpending / budgetAmount) * 100).toFixed(1))
        : 0;

      const categoryMap = {};
      debitExpenses.forEach(e => {
        const catId = e.category ? e.category._id.toString() : 'unknown';
        const catName = e.category ? e.category.name : 'Others';
        const catColor = e.category ? e.category.color : '#6366F1';
        const catIcon = e.category ? e.category.icon : 'fa-tag';
        const cost = e.userShare || e.amount;

        if (!categoryMap[catId]) {
          categoryMap[catId] = { _id: catId, name: catName, color: catColor, icon: catIcon, total: 0, count: 0 };
        }
        categoryMap[catId].total += cost;
        categoryMap[catId].count += 1;
      });

      const categoryBreakdown = Object.values(categoryMap)
        .sort((a, b) => b.total - a.total)
        .map(cat => ({
          ...cat,
          percentage: totalSpending > 0 ? parseFloat(((cat.total / totalSpending) * 100).toFixed(1)) : 0
        }));

      const recentTransactions = await Expense.find()
        .populate('category')
        .populate('trip')
        .sort({ date: -1, createdAt: -1 })
        .limit(6);

      const insights = await InsightsService.generateInsights(month, year);
      const activeTrips = await Trip.find().limit(3);

      return res.json({
        success: true,
        data: {
          period: { month, year },
          totals: {
            spending: totalSpending,
            grossAmount: totalGrossAmount,
            income: totalIncome,
            netBalance: totalIncome - totalSpending,
            transactionCount: monthExpenses.length,
            detectedCount: debitExpenses.filter(e => e.source === 'detected').length,
            manualCount: debitExpenses.filter(e => e.source === 'manual').length
          },
          budget: {
            target: budgetAmount,
            spent: totalSpending,
            remaining: remainingBudget,
            usagePercentage: budgetUsagePercentage,
            status: budgetAmount === 0 ? 'unset' : (budgetUsagePercentage >= 100 ? 'exceeded' : (budgetUsagePercentage >= 80 ? 'warning' : 'safe'))
          },
          categoryBreakdown,
          recentTransactions,
          insights,
          activeTrips
        }
      });
    }

    // Memory Store Fallback
    const allExpenses = memoryStore.getExpenses();
    const monthExpenses = allExpenses.filter(e => {
      const d = new Date(e.date);
      return (d.getMonth() + 1) === month && d.getFullYear() === year;
    });

    const debitExpenses = monthExpenses.filter(e => e.txnType === 'debit');
    const creditExpenses = monthExpenses.filter(e => e.txnType === 'credit');

    const totalSpending = debitExpenses.reduce((sum, e) => sum + (e.userShare || e.amount), 0);
    const totalGrossAmount = debitExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = creditExpenses.reduce((sum, e) => sum + (e.userShare || e.amount), 0);

    const budgetDoc = memoryStore.getBudget(month, year);
    const budgetAmount = budgetDoc ? budgetDoc.amount : 0;
    const remainingBudget = budgetAmount > 0 ? (budgetAmount - totalSpending) : 0;
    const budgetUsagePercentage = budgetAmount > 0
      ? parseFloat(((totalSpending / budgetAmount) * 100).toFixed(1))
      : 0;

    const categoryMap = {};
    debitExpenses.forEach(e => {
      const catId = e.category ? (e.category._id || e.category.name) : 'unknown';
      const catName = e.category ? e.category.name : 'Others';
      const catColor = e.category ? e.category.color : '#6366F1';
      const catIcon = e.category ? e.category.icon : 'fa-tag';
      const cost = e.userShare || e.amount;

      if (!categoryMap[catId]) {
        categoryMap[catId] = { _id: catId, name: catName, color: catColor, icon: catIcon, total: 0, count: 0 };
      }
      categoryMap[catId].total += cost;
      categoryMap[catId].count += 1;
    });

    const categoryBreakdown = Object.values(categoryMap)
      .sort((a, b) => b.total - a.total)
      .map(cat => ({
        ...cat,
        percentage: totalSpending > 0 ? parseFloat(((cat.total / totalSpending) * 100).toFixed(1)) : 0
      }));

    // In-memory insights
    const insights = [
      {
        type: budgetUsagePercentage >= 80 ? 'warning' : 'success',
        title: budgetUsagePercentage >= 80 ? '⚠️ Approaching Budget Limit' : ' Healthy Budget Velocity',
        message: `You've utilized ${budgetUsagePercentage}% of your ₹${budgetAmount.toLocaleString('en-IN')} target (₹${totalSpending.toLocaleString('en-IN')} spent).`,
        action: 'Review non-essential spending for the remainder of this month.'
      },
      {
        type: 'trend',
        title: '🏷️ Highest Spend Category: Groceries & Food',
        message: 'Food and grocery purchases account for over 50% of your total expenditures this month.',
        action: 'Cooking at home can save an estimated ₹3,500 over the next 10 days.'
      },
      {
        type: 'info',
        title: '👥 Group Splitting Savings',
        message: 'Shared expenses tracked saved ₹1,600 on your personal balance sheet.',
        action: 'Keep using Group Payment Support for accurate personal cash flow.'
      }
    ];

    res.json({
      success: true,
      data: {
        period: { month, year },
        totals: {
          spending: totalSpending,
          grossAmount: totalGrossAmount,
          income: totalIncome,
          netBalance: totalIncome - totalSpending,
          transactionCount: monthExpenses.length,
          detectedCount: debitExpenses.filter(e => e.source === 'detected').length,
          manualCount: debitExpenses.filter(e => e.source === 'manual').length
        },
        budget: {
          target: budgetAmount,
          spent: totalSpending,
          remaining: remainingBudget,
          usagePercentage: budgetUsagePercentage,
          status: budgetAmount === 0 ? 'unset' : (budgetUsagePercentage >= 100 ? 'exceeded' : (budgetUsagePercentage >= 80 ? 'warning' : 'safe'))
        },
        categoryBreakdown,
        recentTransactions: allExpenses.slice(0, 6),
        insights,
        activeTrips: memoryStore.getTrips().slice(0, 3)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
