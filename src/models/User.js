const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const problemProgressSchema = new mongoose.Schema(
  {
    problemId: { type: Number, required: true },
    title: { type: String, default: "" },
    tags: { type: [String], default: [] },
    topicId: { type: String, default: null },
    // "dld" | "coal" — defaults to "dld" for backward compat with existing records
    subject: { type: String, enum: ["dld", "coal"], default: "dld" },
    status: {
      type: String,
      enum: ["not_started", "attempted", "solved"],
      default: "not_started",
    },
    attempts: { type: Number, default: 0 },
    openedAt: { type: Date, default: null },
    lastAttemptAt: { type: Date, default: null },
    solvedAt: { type: Date, default: null },
  },
  { _id: false },
);

const topicProgressSchema = new mongoose.Schema(
  {
    topicId: { type: String, required: true },
    title: { type: String, default: "" },
    // "dld" | "coal" — defaults to "dld" for backward compat with existing records
    subject: { type: String, enum: ["dld", "coal"], default: "dld" },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
    },
    openedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    completionPercentage: { type: Number, default: 0 },
    completedSubtopics: { type: [String], default: [] },
    totalSubtopics: { type: Number, default: 0 },
  },
  { _id: false },
);

const activityDaySchema = new mongoose.Schema(
  {
    dateKey: { type: String, required: true }, // "YYYY-MM-DD"
    attempts: { type: Number, default: 0 },
    solved: { type: Number, default: 0 },
    topicsCompleted: { type: Number, default: 0 },
    topicsOpened: { type: Number, default: 0 },
  },
  { _id: false },
);

const recentEventSchema = new mongoose.Schema(
  {
    id: { type: String },
    type: { type: String },
    createdAt: { type: Date, default: Date.now },
    problemId: { type: Number, default: null },
    topicId: { type: String, default: null },
    subtopicId: { type: String, default: null },
    title: { type: String, default: "" },
  },
  { _id: false },
);

// ─── Main User schema ─────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false,
    },

    // ── Legacy flat array kept for backward compat ──
    solvedProblems: {
      type: [Number],
      default: [],
    },

    // ── Rich progress ──
    problemProgress: {
      type: [problemProgressSchema],
      default: [],
    },
    topicProgress: {
      type: [topicProgressSchema],
      default: [],
    },
    activityLog: {
      type: [activityDaySchema],
      default: [],
    },
    recentEvents: {
      type: [recentEventSchema],
      default: [],
    },

    // ── Password reset (forgot password via OTP) ──
    resetPassword: {
      otpHash: { type: String, select: false, default: null },
      otpExpires: { type: Date, select: false, default: null },
      otpAttempts: { type: Number, select: false, default: 0 },
      tokenHash: { type: String, select: false, default: null },
      tokenExpires: { type: Date, select: false, default: null },
    },
  },
  {
    timestamps: true,
  },
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

/** Find or initialise a problemProgress entry */
userSchema.methods.getProblemProgress = function (problemId) {
  let entry = this.problemProgress.find((p) => p.problemId === problemId);
  if (!entry) {
    entry = { problemId, status: "not_started", attempts: 0 };
    this.problemProgress.push(entry);
    entry = this.problemProgress[this.problemProgress.length - 1];
  }
  return entry;
};

/** Find or initialise a topicProgress entry */
userSchema.methods.getTopicProgress = function (topicId) {
  let entry = this.topicProgress.find((t) => t.topicId === topicId);
  if (!entry) {
    entry = { topicId, status: "not_started", completedSubtopics: [] };
    this.topicProgress.push(entry);
    entry = this.topicProgress[this.topicProgress.length - 1];
  }
  return entry;
};

/** Upsert an activity day */
userSchema.methods.getActivityDay = function (dateKey) {
  let day = this.activityLog.find((d) => d.dateKey === dateKey);
  if (!day) {
    day = { dateKey, attempts: 0, solved: 0, topicsCompleted: 0, topicsOpened: 0 };
    this.activityLog.push(day);
    day = this.activityLog[this.activityLog.length - 1];
  }
  return day;
};

/** Prepend a recent event (cap at 30) */
userSchema.methods.pushRecentEvent = function (event) {
  this.recentEvents.unshift(event);
  if (this.recentEvents.length > 30) this.recentEvents = this.recentEvents.slice(0, 30);
};

module.exports = mongoose.model("User", userSchema);
