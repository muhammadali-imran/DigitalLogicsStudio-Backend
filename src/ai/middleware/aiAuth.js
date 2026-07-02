const jwt = require("jsonwebtoken");

function extractToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  if (req.cookies?.token) return req.cookies.token;
  return null;
}

function isLocalDevRequest(req) {
  const host = (req.hostname || "").toLowerCase();
  const origin = req.headers?.origin || "";
  const ip = (req.ip || "").toString();
  return (
    host === "localhost" ||
    origin.includes("localhost") ||
    origin.includes("127.0.0.1") ||
    ip === "::1" ||
    ip === "127.0.0.1"
  );
}

function requireAiAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    if (process.env.NODE_ENV !== "production" && isLocalDevRequest(req)) {
      req.user = null;
      return next();
    }
    return res.status(401).json({
      error: "Authentication required. Please log in to use DLS Mentor.",
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: "Server misconfiguration: missing JWT secret." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      const message =
        err.name === "TokenExpiredError"
          ? "Session expired. Please log in again."
          : "Invalid authentication token.";
      return res.status(401).json({ error: message });
    }
    req.user = decoded;
    next();
  });
}

module.exports = { requireAiAuth };
