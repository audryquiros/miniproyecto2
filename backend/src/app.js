import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import chatRoutes from "./routes/chat.routes.js";
import ingestionRoutes from "./routes/ingestion.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173"
}));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    service: "nuvexa-backend",
    status: "ok"
  });
});

app.use("/api/chat", chatRoutes);
app.use("/api/ingestion", ingestionRoutes);

app.use(errorHandler);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Nuvexa backend running on http://localhost:${port}`);
});
