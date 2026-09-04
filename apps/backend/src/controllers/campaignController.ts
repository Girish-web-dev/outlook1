import type { Request, Response } from "express";
import { getAuthUser } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { campaignService } from "../services/campaignService";

export class CampaignController {
  async create(req: Request, res: Response): Promise<void> {
    const user = getAuthUser(req);
    const result = await campaignService.createCampaign(user.id, req.body);
    res.status(201).json(result);
  }

  async list(req: Request, res: Response): Promise<void> {
    const user = getAuthUser(req);
    const result = await campaignService.listCampaigns(user.id);
    res.json(result);
  }

  async get(req: Request, res: Response): Promise<void> {
    const user = getAuthUser(req);
    const campaign = await campaignService.getCampaign(user.id, req.params.id);
    if (!campaign) {
      throw new AppError(404, "Campaign not found");
    }

    res.json(campaign);
  }
}

export const campaignController = new CampaignController();
