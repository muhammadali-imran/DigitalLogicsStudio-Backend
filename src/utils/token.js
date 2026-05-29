const jwt = require("jsonwebtoken");

function assertAuthConfig() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing in environment variables");
  }
}

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  const cookieExpiresDays = Number(process.env.COOKIE_EXPIRES_DAYS || 7);

  return {
    httpOnly: true,
    // BUG FIX: secure must be true and sameSite must be "none" in production.
    // The frontend (circuits.quantumlogicslimited.com) and backend
    // (digital-logics-studio-backend.vercel.app) are on different domains.
    // Browsers will ONLY send cross-origin cookies when:
    //   1. The server sets SameSite=None
    //   2. The server sets Secure (requires HTTPS — Vercel always uses HTTPS)
    //   3. The browser request has withCredentials: true  ← already set in apiClient
    //
    // With SameSite=Lax (the old value) the cookie was set on login but
    // silently dropped on every subsequent cross-origin request, causing
    // every /api/auth/me call to return 401.
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: cookieExpiresDays * 24 * 60 * 60 * 1000,
    // Do NOT set `domain` here — let the browser handle it.
    // Setting domain to the backend domain blocks the cookie from being sent
    // to a different-domain frontend.
  };
}

function generateToken(userId) {
  assertAuthConfig();

  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function setAuthCookie(res, token) {
  res.cookie("token", token, getCookieOptions());
}

function clearAuthCookie(res) {
  // Must use the same options to properly clear the cookie
  res.clearCookie("token", getCookieOptions());
}

module.exports = {
  assertAuthConfig,
  generateToken,
  setAuthCookie,
  clearAuthCookie,
};
