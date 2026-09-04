import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import passport from "passport";
import pinoHttp from "pino-http";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { env } from "./config/env";
import { configurePassport } from "./config/passport";
import { logger } from "./lib/logger";
import { emailQueue } from "./queues/emailQueue";
import { attachUser, requireAuth } from "./middleware/auth";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { authRoutes } from "./routes/authRoutes";
import { campaignRoutes } from "./routes/campaignRoutes";
import { emailRoutes } from "./routes/emailRoutes";
import { healthRoutes } from "./routes/healthRoutes";
import { slackRoutes } from "./routes/slackRoutes";

export function createApp(): express.Express {
  configurePassport();

  const app = express();
  const bullBoardAdapter = new ExpressAdapter();
  bullBoardAdapter.setBasePath("/admin/queues");

  createBullBoard({
    queues: [new BullMQAdapter(emailQueue)],
    serverAdapter: bullBoardAdapter
  });

  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === "production" ? undefined : false
    })
  );
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true
    })
  );
  app.use(
    pinoHttp({
      logger,
      redact: ["req.headers.authorization", "req.headers.cookie"]
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(passport.initialize());
  app.use(attachUser);

  app.use("/api/auth", authRoutes);
  app.use("/api/campaigns", campaignRoutes);
  app.use("/api/emails", emailRoutes);
  app.use("/api/slack", slackRoutes);
  app.use("/api/health", healthRoutes);
  app.use("/admin/queues", requireAuth, bullBoardAdapter.getRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
