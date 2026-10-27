const Expense = require('../models/Expense');
const Budget = require('../models/Budget');

/**
 * AI Insights Engine
 * Analyzes spending patterns, category variations, budget pacing, and anomalies.
 */
class InsightsService {
  /**
   * Generate comprehensive spending insights for a given month and year
   */
  static async generateInsights(month, year) {
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    // Previous month bounds
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const startOfPrevMonth = new Date(prevYear, prevMonth - 1, 1);
    const endOfPrevMonth = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999);

    // Fetch current month expenses
    const currentExpenses = await Expense.find({
      date: { $gte: startOfMonth, $lte: endOfMonth },
      txnType: 'debit'
    }).populate('category');

    // Fetch previous month expenses
    const prevExpenses = await Expense.find({
      date: { $gte: startOfPrevMonth, $lte: endOfPrevMonth },
      txnType: 'debit'
    }).populate('category');

    // Fetch budget
    const budgetDoc = await Budget.findOne({ month: currentMonth, year: currentYear });
    const budget = budgetDoc ? budgetDoc.amount : 0;

    const insights = [];

    // Calculate totals based on user's share (or full amount if no group split)
    const currentTotal = currentExpenses.reduce((sum, e) => sum + (e.userShare || e.amount), 0);
    const prevTotal = prevExpenses.reduce((sum, e) => sum + (e.userShare || e.amount), 0);

    const now = new Date();
    const isCurrentActiveMonth = now.getFullYear() === currentYear && (now.getMonth() + 1) === currentMonth;
    const daysInMonth = endOfMonth.getDate();
    const currentDay = isCurrentActiveMonth ? Math.min(now.getDate(), daysInMonth) : daysInMonth;

    // 1. Budget Warnings & Pacing
    if (budget > 0) {
      const percentageUsed = (currentTotal / budget) * 100;
      const expectedPacing = (currentDay / daysInMonth) * 100;

      if (percentageUsed >= 100) {
        insights.push({
          type: 'danger',
          title: '🚨 Budget Exceeded!',
          message: `You have spent ₹${currentTotal.toLocaleString('en-IN')}, which exceeds your monthly budget of ₹${budget.toLocaleString('en-IN')} by ${(percentageUsed - 100).toFixed(1)}%.`,
          action: 'Review non-essential spending for the remainder of this month.'
        });
      } else if (percentageUsed >= 80) {
        insights.push({
          type: 'warning',
          title: '⚠️ Approaching Budget Limit',
          message: `You've utilized ${percentageUsed.toFixed(1)}% of your monthly budget (₹${currentTotal.toLocaleString('en-IN')} of ₹${budget.toLocaleString('en-IN')}) with ${daysInMonth - currentDay} days remaining.`,
          action: 'Consider capping dining and leisure expenses to stay within your threshold.'
        });
      }

      // Spend velocity / projection
      if (isCurrentActiveMonth && currentDay >= 3) {
        const dailyBurnRate = currentTotal / currentDay;
        const projectedTotal = dailyBurnRate * daysInMonth;

        if (projectedTotal > budget && percentageUsed < 100) {
          insights.push({
            type: 'warning',
            title: '📈 Projected Overspend Warning',
            message: `At your current rate of ₹${dailyBurnRate.toFixed(0)}/day, your projected month-end spend is ₹${projectedTotal.toFixed(0)}, exceeding your budget by ₹${(projectedTotal - budget).toFixed(0)}.`,
            action: `Aim to keep daily spending below ₹${((budget - currentTotal) / Math.max(daysInMonth - currentDay, 1)).toFixed(0)}/day.`
          });
        } else if (projectedTotal <= budget) {
          insights.push({
            type: 'success',
            title: ' Healthy Budget Pacing',
            message: `Great job! You are pacing well below your monthly budget, projected to save ₹${(budget - projectedTotal).toFixed(0)}.`,
            action: 'Keep up your current spending discipline.'
          });
        }
      }
    } else {
      insights.push({
        type: 'info',
        title: '💡 Set a Monthly Budget',
        message: 'You have not set a budget for this month. Setting a budget helps SpendWise monitor velocity and alert you to overspending.',
        action: 'Head over to Budget Management to establish your spending target.'
      });
    }

    // 2. Category Analysis & Highest Category
    if (currentExpenses.length > 0) {
      const categoryTotals = {};
      currentExpenses.forEach(exp => {
        const catName = exp.category ? exp.category.name : 'Others';
        const cost = exp.userShare || exp.amount;
        categoryTotals[catName] = (categoryTotals[catName] || 0) + cost;
      });

      const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
      if (sortedCategories.length > 0) {
        const [topCategory, topAmount] = sortedCategories[0];
        const categoryShare = ((topAmount / currentTotal) * 100).toFixed(1);

        if (categoryShare >= 35) {
          insights.push({
            type: 'trend',
            title: `🏷️ High Category Concentration: ${topCategory}`,
            message: `${topCategory} accounts for ${categoryShare}% of your total spending (₹${topAmount.toLocaleString('en-IN')}) this month.`,
            action: `Look for opportunities to optimize ${topCategory.toLowerCase()} expenses.`
          });
        }
      }

      // 3. Month-over-Month Comparison
      if (prevTotal > 0) {
        const diff = currentTotal - prevTotal;
        const diffPercent = ((diff / prevTotal) * 100).toFixed(1);

        if (diff > 0 && Math.abs(diffPercent) >= 15) {
          insights.push({
            type: 'warning',
            title: '📊 Month-over-Month Spending Surge',
            message: `You have spent ${diffPercent}% more than last month's total (₹${currentTotal.toLocaleString('en-IN')} vs ₹${prevTotal.toLocaleString('en-IN')}).`,
            action: 'Review recent shopping or high-ticket purchases.'
          });
        } else if (diff < 0 && Math.abs(diffPercent) >= 10) {
          insights.push({
            type: 'success',
            title: '📉 Spending Reduced!',
            message: `Your spending is down ${Math.abs(diffPercent)}% compared to the previous month. You have saved ₹${Math.abs(diff).toLocaleString('en-IN')}.`,
            action: 'Consider transferring your surplus into investments or emergency savings.'
          });
        }
      }

      // 4. Single Transaction Outliers / High Spends
      const avgExpense = currentTotal / currentExpenses.length;
      const outlier = currentExpenses.find(e => (e.userShare || e.amount) >= avgExpense * 2.5 && (e.userShare || e.amount) > 2000);
      if (outlier) {
        insights.push({
          type: 'info',
          title: `🔍 Unusual High-Value Transaction`,
          message: `Your transaction of ₹${(outlier.userShare || outlier.amount).toLocaleString('en-IN')} at "${outlier.merchant}" was significantly higher than your average purchase (₹${avgExpense.toFixed(0)}).`,
          action: 'Ensure this one-off expense is accounted for in your financial plan.'
        });
      }

      // 5. Group Expense Savings
      const groupExpenses = currentExpenses.filter(e => e.isGroup && e.amount > (e.userShare || e.amount));
      if (groupExpenses.length > 0) {
        const savedBySplitting = groupExpenses.reduce((sum, e) => sum + (e.amount - (e.userShare || e.amount)), 0);
        insights.push({
          type: 'success',
          title: '👥 Group Splitting Efficiency',
          message: `You tracked ${groupExpenses.length} shared group expense(s). Recording only your share saved your personal ledger ₹${savedBySplitting.toLocaleString('en-IN')}!`,
          action: 'Keep using Group Payment Support for accurate personal cash flow.'
        });
      }
    } else {
      insights.push({
        type: 'info',
        title: '✨ Welcome to SpendWise',
        message: 'No expenses recorded yet for this month. Paste a bank SMS or add a manual expense to start unlocking intelligent insights.',
        action: 'Try the SMS Detection Sandbox to test automatic extraction!'
      });
    }

    return insights;
  }
}

module.exports = InsightsService;
