const mongoose = require('mongoose');
const Category = require('../models/Category');
const memoryStore = require('../services/memoryStore');

exports.getCategories = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const categories = await Category.find().sort({ name: 1 });
      return res.json({ success: true, count: categories.length, data: categories });
    }
    const categories = memoryStore.getCategories();
    res.json({ success: true, count: categories.length, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
