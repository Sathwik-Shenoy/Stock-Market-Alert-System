const express = require('express');
const { createStrategy, listStrategies } = require('../controllers/strategyController');

const router = express.Router();

router.get('/', listStrategies);
router.post('/', createStrategy);

module.exports = router;
