import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { requireAuth } from "../middleware/auth";
import { AppError } from "../middleware/error";

describe("auth middleware", () => {
  it("rejects unauthenticated requests", () => {
    const next = vi.fn();
    requireAuth({} as Request, {} as Response, next as NextFunction);

    const error = next.mock.calls[0]?.[0];
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(401);
  });

  it("allows authenticated requests", () => {
    const next = vi.fn();
    const req = {
      authUser: {
        id: "user-1",
        name: "Bala",
        email: "bala@example.com"
      }
    } as Request;

    requireAuth(req, {} as Response, next as NextFunction);
    expect(next).toHaveBeenCalledWith();
  });
});
