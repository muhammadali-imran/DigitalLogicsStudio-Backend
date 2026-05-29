// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDateKey = (date = new Date()) =>
  new Date(date).toISOString().slice(0, 10);

const makeEventId = (type) =>
  `${type}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    solvedProblems: user.solvedProblems || [],
    createdAt: user.createdAt,
  };
}

/** Recalculate completion for a topic entry given its totalSubtopics */
function refreshTopicCompletion(entry) {
  const total = Math.max(entry.totalSubtopics || 0, 1);
  const done = entry.completedSubtopics.length;
  entry.completionPercentage = Math.round((done / total) * 100);
  entry.status =
    entry.completionPercentage >= 100
      ? "completed"
      : entry.completionPercentage > 0 || entry.openedAt
        ? "in_progress"
        : "not_started";
}

// ─── Problem progress ─────────────────────────────────────────────────────────

/**
 * POST /api/progress/problems/:problemId/complete
 * Mark a problem as solved (idempotent).
 */
async function completeProblem(req, res, next) {
  try {
    const problemId = Number(req.params.problemId);
    if (!Number.isInteger(problemId) || problemId <= 0) {
      res.status(400);
      throw new Error("Problem id must be a positive integer.");
    }

    const { title = "", tags = [], topicId = null } = req.body || {};
    const dateKey = toDateKey();
    const entry = req.user.getProblemProgress(problemId);

    const wasSolved = entry.status === "solved";
    entry.title = title || entry.title;
    entry.tags = tags.length ? tags : entry.tags;
    entry.topicId = topicId || entry.topicId;
    entry.status = "solved";
    entry.openedAt = entry.openedAt || new Date();
    entry.solvedAt = entry.solvedAt || new Date();
    entry.lastAttemptAt = new Date();

    if (!req.user.solvedProblems.includes(problemId)) {
      req.user.solvedProblems.push(problemId);
    }

    if (!wasSolved) {
      const day = req.user.getActivityDay(dateKey);
      day.solved += 1;
      req.user.pushRecentEvent({
        id: makeEventId("problem_solved"),
        type: "problem_solved",
        createdAt: new Date(),
        problemId,
        title: entry.title,
      });
    }

    req.user.markModified("problemProgress");
    req.user.markModified("activityLog");
    req.user.markModified("recentEvents");
    await req.user.save();

    res.status(200).json({
      success: true,
      message: "Problem marked as completed.",
      user: sanitizeUser(req.user),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/progress/problems/:problemId/uncomplete
 * Un-mark a problem as solved.
 */
async function uncompleteProblem(req, res, next) {
  try {
    const problemId = Number(req.params.problemId);
    if (!Number.isInteger(problemId) || problemId <= 0) {
      res.status(400);
      throw new Error("Problem id must be a positive integer.");
    }

    const entry = req.user.getProblemProgress(problemId);
    if (entry.status === "solved") {
      entry.status = entry.attempts > 0 ? "attempted" : "not_started";
      entry.solvedAt = null;
    }

    req.user.solvedProblems = req.user.solvedProblems.filter(
      (id) => id !== problemId,
    );
    req.user.markModified("problemProgress");
    await req.user.save();

    res.status(200).json({
      success: true,
      message: "Problem un-marked.",
      user: sanitizeUser(req.user),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/progress/problems/:problemId/attempt
 * Record a problem attempt.
 */
async function recordAttempt(req, res, next) {
  try {
    const problemId = Number(req.params.problemId);
    if (!Number.isInteger(problemId) || problemId <= 0) {
      res.status(400);
      throw new Error("Problem id must be a positive integer.");
    }

    const { title = "", tags = [], topicId = null } = req.body || {};
    const dateKey = toDateKey();
    const entry = req.user.getProblemProgress(problemId);

    entry.attempts += 1;
    entry.status = entry.status === "solved" ? "solved" : "attempted";
    entry.openedAt = entry.openedAt || new Date();
    entry.lastAttemptAt = new Date();
    entry.title = title || entry.title;
    entry.tags = tags.length ? tags : entry.tags;
    entry.topicId = topicId || entry.topicId;

    const day = req.user.getActivityDay(dateKey);
    day.attempts += 1;

    req.user.pushRecentEvent({
      id: makeEventId("problem_attempted"),
      type: "problem_attempted",
      createdAt: new Date(),
      problemId,
      title: entry.title,
    });

    req.user.markModified("problemProgress");
    req.user.markModified("activityLog");
    req.user.markModified("recentEvents");
    await req.user.save();

    res.status(200).json({ success: true, message: "Attempt recorded." });
  } catch (error) {
    next(error);
  }
}

// ─── Topic progress ───────────────────────────────────────────────────────────

/**
 * POST /api/progress/topics/:topicId/open
 * Mark a topic as opened / in_progress.
 */
async function openTopic(req, res, next) {
  try {
    const { topicId } = req.params;
    const { title = "", totalSubtopics } = req.body || {};
    const dateKey = toDateKey();
    const entry = req.user.getTopicProgress(topicId);

    entry.title = title || entry.title;
    if (totalSubtopics !== undefined) entry.totalSubtopics = Number(totalSubtopics);
    entry.openedAt = entry.openedAt || new Date();
    if (entry.status !== "completed") entry.status = "in_progress";
    refreshTopicCompletion(entry);

    const day = req.user.getActivityDay(dateKey);
    day.topicsOpened += 1;

    req.user.pushRecentEvent({
      id: makeEventId("topic_opened"),
      type: "topic_opened",
      createdAt: new Date(),
      topicId,
      title: entry.title,
    });

    req.user.markModified("topicProgress");
    req.user.markModified("activityLog");
    req.user.markModified("recentEvents");
    await req.user.save();

    res.status(200).json({
      success: true,
      message: "Topic opened.",
      topicProgress: entry,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/progress/topics/:topicId/subtopics/:subtopicId
 * Toggle a subtopic as completed/incomplete.
 */
async function toggleSubtopic(req, res, next) {
  try {
    const { topicId, subtopicId } = req.params;
    const {
      title = "",
      totalSubtopics,
      equivalentSubtopicIds = [],
    } = req.body || {};
    const dateKey = toDateKey();
    const entry = req.user.getTopicProgress(topicId);

    entry.title = title || entry.title;
    if (totalSubtopics !== undefined) entry.totalSubtopics = Number(totalSubtopics);
    entry.openedAt = entry.openedAt || new Date();

    const completed = new Set(entry.completedSubtopics);
    const equivalentIds = Array.from(
      new Set([subtopicId, ...equivalentSubtopicIds].filter(Boolean)),
    );
    const isCompleted = equivalentIds.some((id) => completed.has(id));

    if (isCompleted) {
      equivalentIds.forEach((id) => completed.delete(id));
    } else {
      completed.add(subtopicId);
    }
    entry.completedSubtopics = Array.from(completed);

    const wasCompleted = entry.status === "completed";
    refreshTopicCompletion(entry);

    if (!wasCompleted && entry.status === "completed") {
      entry.completedAt = new Date();
      const day = req.user.getActivityDay(dateKey);
      day.topicsCompleted += 1;

      req.user.pushRecentEvent({
        id: makeEventId("topic_completed"),
        type: "topic_completed",
        createdAt: new Date(),
        topicId,
        title: entry.title,
      });
    }

    req.user.markModified("topicProgress");
    req.user.markModified("activityLog");
    req.user.markModified("recentEvents");
    await req.user.save();

    res.status(200).json({
      success: true,
      message: "Subtopic toggled.",
      topicProgress: entry,
    });
  } catch (error) {
    next(error);
  }
}

// ─── Full state snapshot ──────────────────────────────────────────────────────

/**
 * GET /api/progress/snapshot
 * Return the user's full progress state so the frontend can hydrate itself.
 */
async function getSnapshot(req, res, next) {
  try {
    const user = req.user;

    const problems = {};
    (user.problemProgress || []).forEach((p) => {
      problems[p.problemId] = {
        attempts: p.attempts,
        status: p.status,
        openedAt: p.openedAt,
        lastAttemptAt: p.lastAttemptAt,
        solvedAt: p.solvedAt,
        title: p.title,
        tags: p.tags,
        topicId: p.topicId,
      };
    });

    const topics = {};
    (user.topicProgress || []).forEach((t) => {
      topics[t.topicId] = {
        status: t.status,
        openedAt: t.openedAt,
        completedAt: t.completedAt,
        completionPercentage: t.completionPercentage,
        completedSubtopics: t.completedSubtopics,
        totalSubtopics: t.totalSubtopics,
        title: t.title,
      };
    });

    const activity = {};
    (user.activityLog || []).forEach((d) => {
      activity[d.dateKey] = {
        attempts: d.attempts,
        solved: d.solved,
        topicsCompleted: d.topicsCompleted,
        topicsOpened: d.topicsOpened,
      };
    });

    res.status(200).json({
      success: true,
      state: {
        problems,
        topics,
        activity,
        recentEvents: user.recentEvents || [],
      },
    });
  } catch (error) {
    next(error);
  }
}

const getProgress = getSnapshot;

module.exports = {
  completeProblem,
  uncompleteProblem,
  recordAttempt,
  openTopic,
  toggleSubtopic,
  getSnapshot,
  getProgress,
};
