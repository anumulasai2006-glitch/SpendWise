const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');

// GET /api/trips - List trips
router.get('/', tripController.getTrips);

// POST /api/trips - Create a trip
router.post('/', tripController.createTrip);

// GET /api/trips/:id - Trip detail with linked expenses
router.get('/:id', tripController.getTripById);

// DELETE /api/trips/:id - Delete a trip
router.delete('/:id', tripController.deleteTrip);

module.exports = router;
