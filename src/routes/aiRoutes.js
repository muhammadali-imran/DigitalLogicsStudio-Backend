const express = require("express");
const { requireAiAuth } = require("../ai/middleware/aiAuth");
const { aiChatRateLimiter } = require("../ai/middleware/aiRateLimit");
const { handleChat, handleChatStream } = require("../ai/controllers/chatController");

const router = express.Router();

router.post("/chat", requireAiAuth, aiChatRateLimiter, handleChat);
router.post("/chat/stream", requireAiAuth, aiChatRateLimiter, handleChatStream);

module.exports = router;
