CREATE TYPE "EmailStatus" AS ENUM ('scheduled', 'processing', 'sent', 'failed');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "googleId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "avatar" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SlackConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accessToken" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "teamName" TEXT NOT NULL,
  "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "disconnectedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SlackConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Campaign" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "startTime" TIMESTAMP(3) NOT NULL,
  "delaySeconds" INTEGER NOT NULL,
  "hourlyLimit" INTEGER NOT NULL,
  "senderEmail" TEXT NOT NULL,
  "senderName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Email" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "senderEmail" TEXT NOT NULL,
  "senderName" TEXT,
  "sequenceNumber" INTEGER NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "status" "EmailStatus" NOT NULL DEFAULT 'scheduled',
  "failureReason" TEXT,
  "bullJobId" TEXT,
  "messageId" TEXT,
  "previewUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");

CREATE INDEX "SlackConnection_userId_idx" ON "SlackConnection"("userId");
CREATE INDEX "SlackConnection_teamId_idx" ON "SlackConnection"("teamId");

CREATE INDEX "Campaign_userId_idx" ON "Campaign"("userId");
CREATE INDEX "Campaign_startTime_idx" ON "Campaign"("startTime");

CREATE UNIQUE INDEX "Email_bullJobId_key" ON "Email"("bullJobId");
CREATE UNIQUE INDEX "Email_campaignId_recipient_key" ON "Email"("campaignId", "recipient");
CREATE INDEX "Email_userId_idx" ON "Email"("userId");
CREATE INDEX "Email_campaignId_idx" ON "Email"("campaignId");
CREATE INDEX "Email_recipient_idx" ON "Email"("recipient");
CREATE INDEX "Email_status_idx" ON "Email"("status");
CREATE INDEX "Email_scheduledAt_idx" ON "Email"("scheduledAt");
CREATE INDEX "Email_sentAt_idx" ON "Email"("sentAt");
CREATE INDEX "Email_campaignId_sequenceNumber_idx" ON "Email"("campaignId", "sequenceNumber");

ALTER TABLE "SlackConnection"
  ADD CONSTRAINT "SlackConnection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Campaign"
  ADD CONSTRAINT "Campaign_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Email"
  ADD CONSTRAINT "Email_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Email"
  ADD CONSTRAINT "Email_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
