const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const DuplicateService = require('../services/duplicateService');
const memoryStore = require('../services/memoryStore');
const { validationResult } = require('express-validator');

exports.getExpenses = async (req, res) => {
  try {
    const { search, category, trip, txnType, source, startDate, endDate, limit = 100, page = 1 } = req.query;

    if (mongoose.connection.readyState === 1) {
      const query = {};
      if (search) {
        query.$or = [
          { merchant: { $regex: search, $options: 'i' } },
          { note: { $regex: search, $options: 'i' } }
        ];
      }
      if (category) query.category = category;
      if (trip) query.trip = trip;
      if (txnType) query.txnType = txnType;
      if (source) query.source = source;
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query.date.$lte = end;
        }
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const total = await Expense.countDocuments(query);
      const expenses = await Expense.find(query)
        .populate('category')
        .populate('trip')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      return res.json({ success: true, count: expenses.length, total, data: expenses });
    }

    // Memory Store Fallback
    const list = memoryStore.getExpenses({ search, category, trip, txnType });
    res.json({ success: true, count: list.length, total: list.length, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createExpense = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    let {
      amount,
      userShare,
      merchant,
      date,
      txnType,
      source,
      paymentMode,
      isGroup,
      groupPeople,
      note,
      category,
      trip,
      rawMessage,
      allowDuplicate
    } = req.body;

    const numAmount = Number(amount);
    let finalUserShare = Number(userShare);

    if (isGroup && (!finalUserShare || isNaN(finalUserShare))) {
      const count = Array.isArray(groupPeople) ? groupPeople.length + 1 : 2;
      finalUserShare = parseFloat((numAmount / count).toFixed(2));
    } else if (!finalUserShare || isNaN(finalUserShare)) {
      finalUserShare = numAmount;
    }

    if (mongoose.connection.readyState === 1) {
      if (!allowDuplicate) {
        const dupCheck = await DuplicateService.checkDuplicate({
          amount: numAmount,
          merchant,
          date: date || new Date()
        });
        if (dupCheck.isDuplicate) {
          return res.status(409).json({
            success: false,
            isDuplicate: true,
            message: dupCheck.reason,
            existingExpense: dupCheck.existingExpense
          });
        }
      }

      const expense = await Expense.create({
        amount: numAmount,
        userShare: finalUserShare,
        merchant: merchant.trim(),
        date: date ? new Date(date) : new Date(),
        txnType: txnType || 'debit',
        source: source || 'manual',
        paymentMode: paymentMode || 'UPI',
        isGroup: Boolean(isGroup),
        groupPeople: Array.isArray(groupPeople) ? groupPeople : (groupPeople ? [groupPeople] : []),
        note: note || '',
        category,
        trip: trip || null,
        rawMessage: rawMessage || null
      });

      const populated = await Expense.findById(expense._id).populate('category').populate('trip');
      return res.status(201).json({ success: true, message: 'Expense added successfully', data: populated });
    }

    // Memory Store Fallback
    const saved = memoryStore.addExpense({
      amount: numAmount,
      userShare: finalUserShare,
      merchant: merchant.trim(),
      date,
      txnType,
      source: source || 'manual',
      paymentMode,
      isGroup,
      groupPeople,
      note,
      category,
      trip,
      rawMessage
    });

    res.status(201).json({ success: true, message: 'Expense added successfully', data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      let expense = await Expense.findById(id);
      if (!expense) return res.status(404).json({ success: false, error: 'Expense not found' });

      const updateData = { ...req.body };
      if (updateData.amount) updateData.amount = Number(updateData.amount);
      if (updateData.userShare) updateData.userShare = Number(updateData.userShare);
      if (updateData.date) updateData.date = new Date(updateData.date);

      expense = await Expense.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
        .populate('category')
        .populate('trip');

      return res.json({ success: true, message: 'Expense updated successfully', data: expense });
    }

    // Memory fallback
    const updated = memoryStore.updateExpense(id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Expense not found' });
    res.json({ success: true, message: 'Expense updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const expense = await Expense.findById(id);
      if (!expense) return res.status(404).json({ success: false, error: 'Expense not found' });
      await expense.deleteOne();
      return res.json({ success: true, message: 'Expense deleted successfully', data: { id } });
    }

    const deleted = memoryStore.deleteExpense(id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Expense not found' });
    res.json({ success: true, message: 'Expense deleted successfully', data: { id } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
