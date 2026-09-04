import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authController } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";

export const authRoutes = Router();

const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

authRoutes.get("/google", oauthLimiter, authController.googleStart.bind(authController));
authRoutes.get("/google/callback", oauthLimiter, authController.googleCallback.bind(authController));
authRoutes.get("/me", requireAuth, authController.me.bind(authController));
authRoutes.post("/logout", requireAuth, authController.logout.bind(authController));
