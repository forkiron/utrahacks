import "dotenv/config";
import cors from "cors";
import express from "express";
import inspectRouter from "./routes/inspect.js";
import coachRouter from "./routes/coach.js";
import { connectMongoDB } from "./services/mongodb.js";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors({ origin: true }));
app.use(express.json());
app.use("/api/inspect", inspectRouter);
app.use("/api/coach", coachRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Initialize MongoDB and start server
async function startServer() {
  try {
    await connectMongoDB();
  } catch (error) {
    console.error("Failed to connect to MongoDB, continuing with in-memory fallback");
  }

  app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
  });
}

startServer();
