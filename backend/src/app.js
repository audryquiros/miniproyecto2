import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import chatRoutes from "./routes/chat.routes.js";
import ingestionRoutes from "./routes/ingestion.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import personnelRoutes from "./routes/personnel.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import { authenticate, requireHR } from "./middleware/auth.middleware.js";
import policiesRoutes from "./routes/policies.routes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    credentials: true,
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  }),
);
app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    service: "nuvexa-backend",
    status: "ok",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/policies", authenticate, policiesRoutes);
app.use("/api/personnel", authenticate, personnelRoutes);
app.use("/api/reports", authenticate, requireHR, reportsRoutes);
app.use("/api/chat", authenticate, chatRoutes);
app.use("/api/ingestion", authenticate, requireHR, ingestionRoutes);

app.use(errorHandler);

export default app;
