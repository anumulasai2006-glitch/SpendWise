const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const memoryStore = require('../services/memoryStore');

exports.getAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (mongoose.connection.readyState === 1) {
      // 1. Trend Aggregation
      const trendAggregation = await Expense.aggregate([
        { $match: { date: { $gte: sixMonthsAgo }, txnType: 'debit' } },
        {
          $group: {
            _id: { year: { $year: '$date' }, month: { $month: '$date' } },
            totalAmount: { $sum: '$amount' },
            totalUserShare: { $sum: '$userShare' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      const trend = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        const label = `${monthNames[m - 1]} ${y}`;
        const match = trendAggregation.find(t => t._id.year === y && t._id.month === m);
        trend.push({
          label,
          year: y,
          month: m,
          total: match ? (match.totalUserShare || match.totalAmount) : 0,
          count: match ? match.count : 0
        });
      }

      // 2. Category Aggregation
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const categoryAggregation = await Expense.aggregate([
        { $match: { date: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth }, txnType: 'debit' } },
        { $group: { _id: '$category', totalSpent: { $sum: '$userShare' }, count: { $sum: 1 } } },
        { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'categoryDetails' } },
        { $unwind: { path: '$categoryDetails', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            totalSpent: 1,
            count: 1,
            name: { $ifNull: ['$categoryDetails.name', 'Others'] },
            icon: { $ifNull: ['$categoryDetails.icon', 'fa-tag'] },
            color: { $ifNull: ['$categoryDetails.color', '#6366F1'] }
          }
        },
        { $sort: { totalSpent: -1 } }
      ]);

      const totalCategorySpent = categoryAggregation.reduce((acc, c) => acc + c.totalSpent, 0);
      const categoryBreakdown = categoryAggregation.map(c => ({
        ...c,
        percentage: totalCategorySpent > 0 ? parseFloat(((c.totalSpent / totalCategorySpent) * 100).toFixed(1)) : 0
      }));

      // 3. Payment Mode & Source
      const paymentModeAggregation = await Expense.aggregate([
        { $match: { date: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth }, txnType: 'debit' } },
        { $group: { _id: '$paymentMode', total: { $sum: '$userShare' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]);

      const sourceAggregation = await Expense.aggregate([
        { $match: { date: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth } } },
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ]);

      return res.json({
        success: true,
        data: {
          currentMonth: { month: now.getMonth() + 1, year: now.getFullYear(), totalSpent: totalCategorySpent },
          sixMonthTrend: trend,
          categoryBreakdown,
          paymentModes: paymentModeAggregation,
          sourceBreakdown: sourceAggregation
        }
      });
    }

    // Memory Store Fallback
    const expenses = memoryStore.getExpenses().filter(e => e.txnType === 'debit');

    // 6-Month Trend
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const label = `${monthNames[m - 1]} ${y}`;

      const monthMatches = expenses.filter(e => {
        const ed = new Date(e.date);
        return ed.getFullYear() === y && (ed.getMonth() + 1) === m;
      });

      const total = monthMatches.reduce((sum, e) => sum + (e.userShare || e.amount), 0);
      trend.push({ label, year: y, month: m, total, count: monthMatches.length });
    }

    // Current Month Category Breakdown
    const currentMonthExpenses = expenses.filter(e => {
      const ed = new Date(e.date);
      return ed.getFullYear() === now.getFullYear() && (ed.getMonth() + 1) === (now.getMonth() + 1);
    });

    const categoryMap = {};
    currentMonthExpenses.forEach(e => {
      const cat = e.category || { name: 'Others', icon: 'fa-tag', color: '#6366F1' };
      const name = cat.name;
      if (!categoryMap[name]) {
        categoryMap[name] = {
          _id: cat._id || name,
          name,
          icon: cat.icon || 'fa-tag',
          color: cat.color || '#6366F1',
          totalSpent: 0,
          count: 0
        };
      }
      categoryMap[name].totalSpent += (e.userShare || e.amount);
      categoryMap[name].count += 1;
    });

    const totalSpent = Object.values(categoryMap).reduce((sum, c) => sum + c.totalSpent, 0);
    const categoryBreakdown = Object.values(categoryMap)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .map(c => ({
        ...c,
        percentage: totalSpent > 0 ? parseFloat(((c.totalSpent / totalSpent) * 100).toFixed(1)) : 0
      }));

    // Payment Modes
    const paymentMap = {};
    currentMonthExpenses.forEach(e => {
      const mode = e.paymentMode || 'Other';
      if (!paymentMap[mode]) paymentMap[mode] = { _id: mode, total: 0, count: 0 };
      paymentMap[mode].total += (e.userShare || e.amount);
      paymentMap[mode].count += 1;
    });

    // Source breakdown
    const sourceMap = { detected: 0, manual: 0 };
    currentMonthExpenses.forEach(e => {
      const s = e.source || 'manual';
      sourceMap[s] = (sourceMap[s] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        currentMonth: { month: now.getMonth() + 1, year: now.getFullYear(), totalSpent },
        sixMonthTrend: trend,
        categoryBreakdown,
        paymentModes: Object.values(paymentMap),
        sourceBreakdown: Object.entries(sourceMap).map(([k, v]) => ({ _id: k, count: v }))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
