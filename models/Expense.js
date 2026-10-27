const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero']
    },
    userShare: {
      type: Number,
      default: function () {
        return this.amount;
      }
    },
    merchant: {
      type: String,
      required: [true, 'Merchant / Payee is required'],
      trim: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    txnType: {
      type: String,
      enum: ['debit', 'credit'],
      default: 'debit'
    },
    source: {
      type: String,
      enum: ['manual', 'detected'],
      default: 'manual'
    },
    paymentMode: {
      type: String,
      enum: ['UPI', 'Card', 'NetBanking', 'Cash', 'Other'],
      default: 'UPI'
    },
    isGroup: {
      type: Boolean,
      default: false
    },
    groupPeople: {
      type: [String],
      default: []
    },
    note: {
      type: String,
      default: ''
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required']
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      default: null
    },
    rawMessage: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound index on (amount, merchant, date) for duplicate detection
expenseSchema.index({ amount: 1, merchant: 1, date: 1 });
expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ trip: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
