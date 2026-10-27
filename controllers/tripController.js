const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const Expense = require('../models/Expense');
const memoryStore = require('../services/memoryStore');

exports.getTrips = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const trips = await Trip.find().sort({ createdAt: -1 });
      const tripsWithMetrics = await Promise.all(
        trips.map(async trip => {
          const expenses = await Expense.find({ trip: trip._id, txnType: 'debit' });
          const totalSpent = expenses.reduce((sum, e) => sum + (e.userShare || e.amount), 0);
          const remaining = trip.budget > 0 ? (trip.budget - totalSpent) : 0;
          const percentage = trip.budget > 0 ? parseFloat(((totalSpent / trip.budget) * 100).toFixed(1)) : 0;
          return { ...trip.toObject(), totalSpent, remaining, percentage, expenseCount: expenses.length };
        })
      );
      return res.json({ success: true, count: tripsWithMetrics.length, data: tripsWithMetrics });
    }

    // Memory Fallback
    const trips = memoryStore.getTrips();
    const tripsWithMetrics = trips.map(trip => {
      const expenses = memoryStore.getExpenses().filter(e => e.trip && e.trip._id === trip._id && e.txnType === 'debit');
      const totalSpent = expenses.reduce((sum, e) => sum + (e.userShare || e.amount), 0);
      const remaining = trip.budget > 0 ? (trip.budget - totalSpent) : 0;
      const percentage = trip.budget > 0 ? parseFloat(((totalSpent / trip.budget) * 100).toFixed(1)) : 0;
      return { ...trip, totalSpent, remaining, percentage, expenseCount: expenses.length };
    });
    res.json({ success: true, count: tripsWithMetrics.length, data: tripsWithMetrics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createTrip = async (req, res) => {
  try {
    const { name, destination, startDate, endDate, budget, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Trip name is required' });

    if (mongoose.connection.readyState === 1) {
      const trip = await Trip.create({
        name: name.trim(),
        destination: destination || '',
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        budget: Number(budget) || 0,
        notes: notes || ''
      });
      return res.status(201).json({ success: true, message: 'Trip created successfully', data: trip });
    }

    const saved = memoryStore.addTrip({ name, destination, startDate, endDate, budget, notes });
    res.status(201).json({ success: true, message: 'Trip created successfully', data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getTripById = async (req, res) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const trip = await Trip.findById(id);
      if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });

      const expenses = await Expense.find({ trip: id }).populate('category').sort({ date: -1 });
      const totalSpent = expenses.filter(e => e.txnType === 'debit').reduce((sum, e) => sum + (e.userShare || e.amount), 0);
      const remaining = trip.budget > 0 ? (trip.budget - totalSpent) : 0;
      const percentage = trip.budget > 0 ? parseFloat(((totalSpent / trip.budget) * 100).toFixed(1)) : 0;

      return res.json({
        success: true,
        data: { trip, totalSpent, remaining, percentage, expenseCount: expenses.length, expenses }
      });
    }

    const trip = memoryStore.getTripById(id);
    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });
    const expenses = memoryStore.getExpenses().filter(e => e.trip && e.trip._id === id);
    const totalSpent = expenses.filter(e => e.txnType === 'debit').reduce((sum, e) => sum + (e.userShare || e.amount), 0);
    const remaining = trip.budget > 0 ? (trip.budget - totalSpent) : 0;
    const percentage = trip.budget > 0 ? parseFloat(((totalSpent / trip.budget) * 100).toFixed(1)) : 0;

    res.json({
      success: true,
      data: { trip, totalSpent, remaining, percentage, expenseCount: expenses.length, expenses }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteTrip = async (req, res) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const trip = await Trip.findById(id);
      if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });
      await Expense.updateMany({ trip: id }, { $set: { trip: null } });
      await trip.deleteOne();
      return res.json({ success: true, message: 'Trip deleted successfully', data: { id } });
    }

    const deleted = memoryStore.deleteTrip(id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Trip not found' });
    res.json({ success: true, message: 'Trip deleted successfully', data: { id } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
