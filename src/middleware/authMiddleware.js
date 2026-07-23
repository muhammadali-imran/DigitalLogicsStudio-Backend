const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { createHttpError } = require("../utils/httpError");

// Only the fields actually needed for auth checks + the lightweight
// legacy solvedProblems array. Progress detail lives in UserProgress now,
// so this query no longer pulls it in on every request.
const AUTH_SELECT_FIELDS = "_id name email createdAt solvedProblems";

async function protect(req, res, next) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return next(createHttpError(401, "Not authorized. Please log in."));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select(AUTH_SELECT_FIELDS);

    if (!user) {
      return next(createHttpError(401, "User account no longer exists."));
    }

    req.user = user;
    next();
  } catch (error) {
    return next(createHttpError(401, "Session is invalid or has expired."));
  }
}

module.exports = { protect };