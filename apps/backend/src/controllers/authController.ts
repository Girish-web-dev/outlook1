import type { NextFunction, Request, Response } from "express";
import type { User } from "@prisma/client";
import passport from "passport";
import { env } from "../config/env";
import { authService } from "../services/authService";
import { getAuthUser } from "../middleware/auth";
import { AppError } from "../middleware/error";

function isPrismaUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as { id?: unknown }).id === "string"
  );
}

export class AuthController {
  googleStart(req: Request, res: Response, next: NextFunction): void {
    if (!env.GOOGLE_CONFIGURED) {
      next(new AppError(503, "Google OAuth is not configured"));
      return;
    }

    passport.authenticate("google", {
      scope: ["profile", "email"],
      session: false
    })(req, res, next);
  }

  googleCallback(req: Request, res: Response, next: NextFunction): void {
    if (!env.GOOGLE_CONFIGURED) {
      next(new AppError(503, "Google OAuth is not configured"));
      return;
    }

    passport.authenticate(
      "google",
      { session: false },
      (error: unknown, user: unknown) => {
        if (error) {
          next(error);
          return;
        }

        if (!isPrismaUser(user)) {
          next(new AppError(401, "Google authentication failed"));
          return;
        }

        authService.setSessionCookie(res, user.id);
        res.redirect(`${env.FRONTEND_URL}/dashboard`);
      }
    )(req, res, next);
  }

  me(req: Request, res: Response): void {
    const user = getAuthUser(req);
    res.json(user);
  }

  logout(_req: Request, res: Response): void {
    authService.clearSessionCookie(res);
    res.status(204).send();
  }
}

export const authController = new AuthController();
