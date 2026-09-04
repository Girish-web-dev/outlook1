import { Router } from "express";
import rateLimit from "express-rate-limit";
import { slackController } from "../controllers/slackController";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";

export const slackRoutes = Router();

const slackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

slackRoutes.use(requireAuth);
slackRoutes.get("/connect", slackLimiter, slackController.connect.bind(slackController));
slackRoutes.get("/callback", slackLimiter, asyncHandler(slackController.callback.bind(slackController)));
slackRoutes.get("/status", asyncHandler(slackController.status.bind(slackController)));
slackRoutes.post("/disconnect", asyncHandler(slackController.disconnect.bind(slackController)));
