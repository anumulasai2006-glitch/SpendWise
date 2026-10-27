const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100
    },
    amount: {
      type: Number,
      required: [true, 'Budget amount is required'],
      min: [0, 'Budget must be a non-negative number']
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Unique compound index on (month, year) as specified in the PDF
budgetSchema.index({ month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
