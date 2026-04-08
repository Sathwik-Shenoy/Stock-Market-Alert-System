const express = require('express');
const { startBacktest, listBacktests } = require('../controllers/backtestController');

const router = express.Router();

router.get('/', listBacktests);
router.post('/', startBacktest);

module.exports = router;
