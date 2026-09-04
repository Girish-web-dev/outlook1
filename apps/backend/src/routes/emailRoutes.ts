import { Router } from "express";
import { emailController } from "../controllers/emailController";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";

export const emailRoutes = Router();

emailRoutes.use(requireAuth);
emailRoutes.get("/scheduled", asyncHandler(emailController.scheduled.bind(emailController)));
emailRoutes.get("/sent", asyncHandler(emailController.sent.bind(emailController)));
emailRoutes.get("/search", asyncHandler(emailController.search.bind(emailController)));
emailRoutes.get("/:id", asyncHandler(emailController.get.bind(emailController)));
