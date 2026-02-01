import "dotenv/config";
import cors from "cors";
import express from "express";
import inspectRouter from "./routes/inspect.js";
import coachRouter from "./routes/coach.js";
import auditTrailsRouter from "./routes/auditTrails.js";
import audioRouter from "./routes/audio.js";
import voicesRouter from "./routes/voices.js";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors({ origin: true }));
app.use(express.json({ limit: "20mb" }));
app.use("/api/inspect", inspectRouter);
app.use("/api/coach", coachRouter);
app.use("/api/audit-trails", auditTrailsRouter);
app.use("/api/audio", audioRouter);
app.use("/api/voices", voicesRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});
