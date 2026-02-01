import { Router } from "express";
import { getVoiceProfiles } from "../services/voiceProfiles.js";
import { createRateLimiter } from "../services/rateLimit.js";

const router = Router();
const rateLimit = createRateLimiter({ windowMs: 60_000, max: 60 });

router.get("/profiles", rateLimit, (_req, res) => {
  res.json(getVoiceProfiles());
});

export default router;
