const express = require('express');
const mongoose = require('mongoose');
const AlertNotification = require('../../../shared/models/AlertNotification');

const router = express.Router();

function parseUserId(req) {
  const userId = req.headers['x-user-id'];
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    const err = new Error('invalid_or_missing_x_user_id');
    err.statusCode = 400;
    throw err;
  }
  return new mongoose.Types.ObjectId(userId);
}

router.get('/', async (req, res, next) => {
  try {
    const userId = parseUserId(req);
    const { since, page = 1, limit = 50 } = req.query;
    const q = { userId };
    if (since) q.eventTimestamp = { $gte: new Date(String(since)) };

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      AlertNotification.find(q).sort({ eventTimestamp: -1 }).skip(skip).limit(Number(limit)).lean(),
      AlertNotification.countDocuments(q)
    ]);

    res.json({ items, page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

