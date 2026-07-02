const rateLimit = require("express-rate-limit");

const WINDOW_MS = parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS, 10) || 60000;
const MAX_REQUESTS = parseInt(process.env.AI_RATE_LIMIT_MAX, 10) || 20;

const aiChatRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const id = req.user?.id || req.user?._id || req.user?.userId;
    if (id) return String(id);
    return req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many requests. Please wait a moment before asking again.",
    });
  },
});

module.exports = { aiChatRateLimiter };
