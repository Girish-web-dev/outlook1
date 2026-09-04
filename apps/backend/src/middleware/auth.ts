import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import type { AuthenticatedUser } from "../types/domain";
import { AppError } from "./error";

export const AUTH_COOKIE_NAME = "reachinbox_session";

interface SessionTokenPayload {
  sub: string;
}

function isSessionTokenPayload(value: string | jwt.JwtPayload): value is jwt.JwtPayload & SessionTokenPayload {
  return typeof value !== "string" && typeof value.sub === "string";
}

export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.header("authorization");
  const bearerToken = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
  const token = req.cookies?.[AUTH_COOKIE_NAME] ?? bearerToken;

  if (!token || typeof token !== "string") {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, env.SESSION_SECRET);
    if (!isSessionTokenPayload(decoded)) {
      next();
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, name: true, email: true, avatar: true }
    });

    if (user) {
      req.authUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar ?? undefined
      };
    }
  } catch {
    next();
    return;
  }

  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.authUser) {
    next(new AppError(401, "Authentication required"));
    return;
  }

  next();
}

export function getAuthUser(req: Request): AuthenticatedUser {
  if (!req.authUser) {
    throw new AppError(401, "Authentication required");
  }

  return req.authUser;
}
