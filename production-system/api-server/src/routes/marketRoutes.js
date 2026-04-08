const express = require('express');
const { getLatestQuote, getHistorical } = require('../controllers/marketController');

const router = express.Router();

router.get('/latest/:symbol', getLatestQuote);
router.get('/historical/:symbol', getHistorical);

module.exports = router;
