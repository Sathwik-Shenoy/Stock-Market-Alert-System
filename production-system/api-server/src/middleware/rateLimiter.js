const rateLimit = require('express-rate-limit');

const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.API_RATE_LIMIT_PER_MIN || 6000),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.headers['x-user-id'];
    return userId ? `user:${String(userId)}` : req.ip;
  },
  message: {
    error: 'too_many_requests',
    message: 'Rate limit exceeded. Retry after one minute.'
  }
});

module.exports = { apiRateLimiter };
