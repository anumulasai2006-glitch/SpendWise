const express = require('express');
const router = express.Router();
const detectController = require('../controllers/detectController');

// POST /api/detect/parse - Parse a transaction message; return amount, merchant, category, duplicate flag
router.post('/parse', detectController.parseMessage);

// POST /api/detect/confirm - Save a confirmed detected transaction
router.post('/confirm', detectController.confirmTransaction);

module.exports = router;
