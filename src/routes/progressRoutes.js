const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { loadUserProgress } = require("../middleware/loadUserProgress");
const {
  completeProblem,
  uncompleteProblem,
  recordAttempt,
  openTopic,
  toggleSubtopic,
  getProgress,
} = require("../controllers/progressController");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Progress
 *   description: User progress tracking endpoints
 */

// All progress routes require authentication, and all of them need the
// UserProgress document — so both middlewares run for the whole router.
// (Other routers, like auth and AI chat, don't load loadUserProgress at
// all, so they never pay for this extra query.)
router.use(protect);
router.use(loadUserProgress);

/**
 * @swagger
 * /api/progress:
 *   get:
 *     summary: Get complete user progress
 *     tags: [Progress]
 *     description: Retrieves the authenticated user's complete progress snapshot, including problems, topics, and activity logs.
 *     responses:
 *       200:
 *         description: Successfully retrieved user progress state
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ProgressState'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", getProgress);

/**
 * @swagger
 * /api/progress/snapshot:
 *   get:
 *     summary: Get a snapshot of user progress
 *     tags: [Progress]
 *     description: Alias for retrieving the authenticated user's complete progress snapshot.
 *     responses:
 *       200:
 *         description: Successfully retrieved user progress state
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ProgressState'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/snapshot", getProgress);

/**
 * @swagger
 * /api/progress/problems/{problemId}/complete:
 *   post:
 *     summary: Mark a problem as completed
 *     tags: [Progress]
 *     description: >
 *       Adds the given problem ID to the user's solvedProblems list (idempotent —
 *       calling it again for the same problem is safe). Requires authentication.
 *       In Swagger UI, log in via POST /api/auth/login first.
 *     parameters:
 *       - in: path
 *         name: problemId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Positive integer ID of the problem to mark as solved
 *         example: 5
 *     responses:
 *       200:
 *         description: Problem marked as completed (or was already marked)
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid problemId (not a positive integer)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/problems/:problemId/complete", completeProblem);

/**
 * @swagger
 * /api/progress/problems/{problemId}/uncomplete:
 *   post:
 *     summary: Unmark a problem as completed
 *     tags: [Progress]
 *     description: Removes the given problem ID from the user's solvedProblems list.
 *     parameters:
 *       - in: path
 *         name: problemId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Positive integer ID of the problem to unmark
 *     responses:
 *       200:
 *         description: Problem successfully unmarked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid problemId
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Not authenticated
 */
router.post("/problems/:problemId/uncomplete", uncompleteProblem);

/**
 * @swagger
 * /api/progress/problems/{problemId}/attempt:
 *   post:
 *     summary: Record an attempt for a problem
 *     tags: [Progress]
 *     description: Logs a new attempt for a specific problem in the activity history.
 *     parameters:
 *       - in: path
 *         name: problemId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the problem being attempted
 *     responses:
 *       200:
 *         description: Attempt recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Not authenticated
 */
router.post("/problems/:problemId/attempt", recordAttempt);

/**
 * @swagger
 * /api/progress/topics/{topicId}/open:
 *   post:
 *     summary: Open a topic
 *     tags: [Progress]
 *     description: Marks a specific topic as opened/in-progress for the user.
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *         description: String ID of the topic (e.g., 'boolean-algebra')
 *     responses:
 *       200:
 *         description: Topic marked as opened
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Not authenticated
 */
router.post("/topics/:topicId/open", openTopic);

/**
 * @swagger
 * /api/progress/topics/{topicId}/subtopics/{subtopicId}:
 *   post:
 *     summary: Toggle subtopic completion
 *     tags: [Progress]
 *     description: Toggles a specific subtopic between completed and uncompleted states.
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the parent topic
 *       - in: path
 *         name: subtopicId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the subtopic to toggle
 *     responses:
 *       200:
 *         description: Subtopic status toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Not authenticated
 */
router.post("/topics/:topicId/subtopics/:subtopicId", toggleSubtopic);

module.exports = router;
