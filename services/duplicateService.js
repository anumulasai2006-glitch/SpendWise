const Expense = require('../models/Expense');

/**
 * Duplicate Detection Service
 * Prevents identical transactions from being logged multiple times.
 */
class DuplicateService {
  /**
   * Check if a transaction already exists
   * @param {Object} txn - { amount, merchant, date }
   * @param {String} [excludeId] - ID to exclude if updating
   */
  static async checkDuplicate({ amount, merchant, date }, excludeId = null) {
    if (!amount || !merchant) {
      return { isDuplicate: false, existingExpense: null };
    }

    const txnDate = date ? new Date(date) : new Date();
    // Allow a window of same calendar day (start of day to end of day)
    const startOfDay = new Date(txnDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(txnDate);
    endOfDay.setHours(23, 59, 59, 999);

    const query = {
      amount: Number(amount),
      merchant: { $regex: new RegExp(`^${merchant.trim()}$`, 'i') },
      date: { $gte: startOfDay, $lte: endOfDay }
    };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    try {
      const existingExpense = await Expense.findOne(query).populate('category');

      if (existingExpense) {
        return {
          isDuplicate: true,
          reason: `Exact match found for ${merchant} of ₹${amount} on ${txnDate.toLocaleDateString()}`,
          existingExpense
        };
      }

      return {
        isDuplicate: false,
        existingExpense: null
      };
    } catch (err) {
      console.error('Error during duplicate check:', err);
      return { isDuplicate: false, error: err.message };
    }
  }
}

module.exports = DuplicateService;
