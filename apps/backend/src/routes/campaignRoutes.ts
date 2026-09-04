import { Router } from "express";
import { campaignController } from "../controllers/campaignController";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createCampaignSchema } from "../services/campaignService";

export const campaignRoutes = Router();

campaignRoutes.use(requireAuth);
campaignRoutes.post("/", validateBody(createCampaignSchema), asyncHandler(campaignController.create.bind(campaignController)));
campaignRoutes.get("/", asyncHandler(campaignController.list.bind(campaignController)));
campaignRoutes.get("/:id", asyncHandler(campaignController.get.bind(campaignController)));
