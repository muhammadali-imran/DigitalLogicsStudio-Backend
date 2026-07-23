const UserProgress = require("../models/UserProgress");

/**
 * Attaches req.progress — the authenticated user's UserProgress document,
 * created on first access. Must run after `protect` (needs req.user._id).
 *
 * Kept as its own middleware (rather than folded into `protect`) so that
 * routes which don't need progress data — auth checks, AI chat, etc. —
 * never pay for this extra query.
 */
async function loadUserProgress(req, res, next) {
    try {
        const progress = await UserProgress.findOrCreateForUser(req.user._id);
        req.progress = progress;
        next();
    } catch (error) {
        next(error);
    }
}

module.exports = { loadUserProgress };