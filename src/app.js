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
const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
const normalizedClientUrl = clientUrl.replace(/\/$/, "");

app.set("trust proxy", 1);

app.use(
  cors({
    origin: normalizedClientUrl,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Digital Logics Studio backend is running."
  });
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/progress", progressRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
