const express = require("express");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: API health check
 */

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     description: Returns 200 if the API server is running.
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     environment:
 *                       type: string
 *                       example: development
 */
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is healthy",
    environment: process.env.NODE_ENV || "development",
    ai: {
      groqConfigured: Boolean(process.env.GROQ_API_KEY),
      pineconeConfigured: Boolean(process.env.PINECONE_API_KEY),
    },
  });
});

module.exports = router;
