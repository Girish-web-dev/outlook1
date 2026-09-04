import type { Request, Response } from "express";
import { getAuthUser } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { emailService } from "../services/emailService";

function parsePage(value: unknown, fallback: number): number {
  if (typeof value !== "string") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export class EmailController {
  async scheduled(req: Request, res: Response): Promise<void> {
    const user = getAuthUser(req);
    const page = parsePage(req.query.page, 1);
    const pageSize = parsePage(req.query.pageSize, 25);
    const emails = await emailService.listScheduled(user.id, page, pageSize);
    res.json({ emails, page, pageSize });
  }

  async sent(req: Request, res: Response): Promise<void> {
    const user = getAuthUser(req);
    const page = parsePage(req.query.page, 1);
    const pageSize = parsePage(req.query.pageSize, 25);
    const emails = await emailService.listSent(user.id, page, pageSize);
    res.json({ emails, page, pageSize });
  }

  async search(req: Request, res: Response): Promise<void> {
    const user = getAuthUser(req);
    const query = typeof req.query.q === "string" ? req.query.q : "";
    const emails = await emailService.searchEmails(user.id, query);
    res.json({ emails });
  }

  async get(req: Request, res: Response): Promise<void> {
    const user = getAuthUser(req);
    const email = await emailService.getEmail(user.id, req.params.id);
    if (!email) {
      throw new AppError(404, "Email not found");
    }

    res.json(email);
  }
}

export const emailController = new EmailController();
