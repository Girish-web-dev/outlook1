import type { Request, Response } from "express";
import { env } from "../config/env";
import { getAuthUser } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { slackService } from "../services/slackService";

export class SlackController {
  connect(req: Request, res: Response): void {
    const user = getAuthUser(req);
    const url = slackService.buildAuthorizeUrl(user.id);
    res.redirect(url);
  }

  async callback(req: Request, res: Response): Promise<void> {
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;

    if (!code || !state) {
      throw new AppError(400, "Slack OAuth callback is missing code or state");
    }

    await slackService.handleCallback(code, state);
    res.redirect(`${env.FRONTEND_URL}/dashboard?slack=connected`);
  }

  async status(req: Request, res: Response): Promise<void> {
    const user = getAuthUser(req);
    const status = await slackService.getStatus(user.id);
    res.json(status);
  }

  async disconnect(req: Request, res: Response): Promise<void> {
    const user = getAuthUser(req);
    await slackService.disconnect(user.id);
    res.status(204).send();
  }
}

export const slackController = new SlackController();
