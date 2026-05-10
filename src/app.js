const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

const authRoutes = require("./routes/authRoutes");
const healthRoutes = require("./routes/healthRoutes");
const progressRoutes = require("./routes/progressRoutes");
const { errorHandler, notFound } = require("./middleware/errorMiddleware");

dotenv.config();

const app = express();

// ─── Trust proxy (required on Vercel / behind load balancers) ────────────────
app.set("trust proxy", 1);

// ─── Body parsers — MUST come before CORS and all routes ────────────────────
// BUG FIX: On Vercel the request body stream can be consumed before it reaches
// express.json() if middleware order is wrong.  Putting body parsers first
// ensures they always run, which fixes the 400 "fields are required" error
// (the body was arriving as {} because it wasn't being parsed).
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// ─── CORS ────────────────────────────────────────────────────────────────────
// Must list every origin the browser sends.  Credentials:true is required for
// the httpOnly cookie to be forwarded on cross-origin requests.
const allowedOrigins = [
  "http://localhost:3000",
  "https://circuits.quantumlogicslimited.com",
  "https://digital-logics-studio.vercel.app",
  "https://circuit.quantumlogicslimited.com",
  "https://digital-logics-studio-kccbyx2bo-seno-quantum-coders-projects.vercel.app",
  // Dynamically include whatever CLIENT_URL is set to in the environment
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin / no-origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy blocked origin: ${origin}`));
      }
    },
    credentials: true, // allow cookies cross-origin
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Set-Cookie"],
  }),
);

// ─── Swagger UI ──────────────────────────────────────────────────────────────
{
  const swaggerUi = require("swagger-ui-express");
  const swaggerSpec = require("./config/swagger");

  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: "Digital Logics Studio — API Docs",
      swaggerOptions: { withCredentials: true },
    }),
  );

  app.get("/api/docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
}

// ─── Root ping ───────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Digital Logics Studio backend is running.",
  });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/progress", progressRoutes);

// ─── Error handlers ──────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
