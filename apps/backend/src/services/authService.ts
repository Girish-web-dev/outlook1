import type { Response } from "express";
import jwt from "jsonwebtoken";
import type { User } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { AUTH_COOKIE_NAME } from "../middleware/auth";

export interface GoogleProfileInput {
  googleId: string;
  name: string;
  email: string;
  avatar?: string;
}

export class AuthService {
  async upsertGoogleUser(input: GoogleProfileInput): Promise<User> {
    return prisma.user.upsert({
      where: { googleId: input.googleId },
      update: {
        name: input.name,
        email: input.email,
        avatar: input.avatar
      },
      create: {
        googleId: input.googleId,
        name: input.name,
        email: input.email,
        avatar: input.avatar
      }
    });
  }

  setSessionCookie(res: Response, userId: string): void {
    const token = jwt.sign({}, env.SESSION_SECRET, {
      subject: userId,
      expiresIn: "7d"
    });

    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.IS_PRODUCTION,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/"
    });
  }

  clearSessionCookie(res: Response): void {
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: env.IS_PRODUCTION,
      sameSite: "lax",
      path: "/"
    });
  }
}

export const authService = new AuthService();
