const mongoose = require('mongoose');
const ParserService = require('../services/parserService');
const CategorizationService = require('../services/categorizationService');
const DuplicateService = require('../services/duplicateService');
const Expense = require('../models/Expense');
const Category = require('../models/Category');
const memoryStore = require('../services/memoryStore');

exports.parseMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Please provide a transaction message text'
      });
    }

    const parsedData = ParserService.parseMessage(message);
    const categoryPrediction = CategorizationService.predictCategory(
      parsedData.merchant,
      parsedData.rawMessage
    );

    let categoryObj = null;
    let dupCheck = { isDuplicate: false };

    if (mongoose.connection.readyState === 1) {
      let categoryDoc = await Category.findOne({ name: categoryPrediction.categoryName });
      if (!categoryDoc) {
        categoryDoc = await Category.findOne({ name: 'Others' }) || await Category.findOne();
      }
      if (categoryDoc) {
        categoryObj = {
          _id: categoryDoc._id,
          name: categoryDoc.name,
          icon: categoryDoc.icon,
          color: categoryDoc.color
        };
      }
      dupCheck = await DuplicateService.checkDuplicate({
        amount: parsedData.amount,
        merchant: parsedData.merchant,
        date: parsedData.date
      });
    } else {
      categoryObj = memoryStore.getCategoryByName(categoryPrediction.categoryName);
      dupCheck = memoryStore.checkDuplicate({
        amount: parsedData.amount,
        merchant: parsedData.merchant,
        date: parsedData.date
      });
    }

    res.json({
      success: true,
      data: {
        isFinancial: parsedData.isFinancial,
        amount: parsedData.amount,
        merchant: parsedData.merchant,
        date: parsedData.date,
        txnType: parsedData.txnType,
        paymentMode: parsedData.paymentMode,
        source: 'detected',
        confidence: parsedData.confidence,
        rawMessage: parsedData.rawMessage,
        category: categoryObj || {
          name: categoryPrediction.categoryName,
          icon: categoryPrediction.icon,
          color: categoryPrediction.color
        },
        isDuplicate: dupCheck.isDuplicate,
        duplicateInfo: dupCheck.isDuplicate ? dupCheck.reason : null,
        existingExpense: dupCheck.existingExpense || null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.confirmTransaction = async (req, res) => {
  try {
    let {
      amount,
      userShare,
      merchant,
      date,
      txnType,
      paymentMode,
      category,
      trip,
      isGroup,
      groupPeople,
      note,
      rawMessage,
      allowDuplicate
    } = req.body;

    if (!amount || !merchant || !category) {
      return res.status(400).json({
        success: false,
        error: 'Amount, merchant, and category are required'
      });
    }

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
        source: 'detected',
        paymentMode: paymentMode || 'UPI',
        isGroup: Boolean(isGroup),
        groupPeople: Array.isArray(groupPeople) ? groupPeople : (groupPeople ? [groupPeople] : []),
        note: note || '',
        category,
        trip: trip || null,
        rawMessage: rawMessage || null
      });

      const populated = await Expense.findById(expense._id).populate('category').populate('trip');
      return res.status(201).json({
        success: true,
        message: 'Detected transaction confirmed and saved',
        data: populated
      });
    }

    // Memory Store Fallback
    const saved = memoryStore.addExpense({
      amount: numAmount,
      userShare: finalUserShare,
      merchant: merchant.trim(),
      date,
      txnType,
      paymentMode,
      category,
      trip,
      isGroup,
      groupPeople,
      note,
      rawMessage,
      source: 'detected'
    });

    res.status(201).json({
      success: true,
      message: 'Detected transaction confirmed and saved',
      data: saved
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
