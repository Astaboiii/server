import express from "express";
import cors from "cors";
import routes from "./routes/index.js";
import authRoutes from "./routes/authRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import scoreRoutes from "./routes/scoreRoutes.js";
import adminDrawRoutes from "./routes/adminDrawRoutes.js";
import adminCharityRoutes from "./routes/adminCharityRoutes.js";
import winnerRoutes from "./routes/winnerRoutes.js";
import adminWinnerRoutes from "./routes/adminWinnerRoutes.js";
import adminUserRoutes from "./routes/adminUserRoutes.js";
import adminReportRoutes from "./routes/adminReportRoutes.js";
import razorpayWebhookRoute from "./routes/razorpayWebhookRoute.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { isSupabaseConfigured } from "./lib/supabase.js";
import { isRazorpayConfigured } from "./lib/razorpay.js";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS."));
    },
  })
);
app.use("/api/razorpay/webhook", express.raw({ type: "application/json" }), razorpayWebhookRoute);
app.use(express.json({ limit: "8mb" }));
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "golf-charity-server",
    deployment: {
      url: process.env.VERCEL_URL || process.env.CLIENT_URL || "local",
      environment: process.env.NODE_ENV || "development",
    },
    database: {
      provider: "supabase",
      configured: isSupabaseConfigured(),
    },
    payments: {
      provider: "razorpay",
      configured: isRazorpayConfigured(),
    },
    markets: (process.env.SUPPORTED_MARKETS || "US,IN,UK").split(","),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/scores", scoreRoutes);
app.use("/api/admin/draws", adminDrawRoutes);
app.use("/api/admin/charities", adminCharityRoutes);
app.use("/api/admin", adminUserRoutes);
app.use("/api/admin", adminReportRoutes);
app.use("/api/winnings", winnerRoutes);
app.use("/api/admin/winners", adminWinnerRoutes);
app.use("/api", routes);
app.use(errorHandler);

export default app;
