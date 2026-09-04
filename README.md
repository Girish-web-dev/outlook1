# ReachInbox Email Scheduler

Production-style full-stack email scheduler built with React, Express, Prisma, PostgreSQL, Redis, BullMQ, Ethereal, Elasticsearch, Google OAuth, and Slack OAuth.

## Features

Backend:
- Real Google OAuth login with HTTP-only auth cookie
- Campaign creation with email validation and normalization
- BullMQ delayed jobs, one job per email
- PostgreSQL as authoritative state
- Redis-backed queue, hourly rate limit, minimum send delay, and Slack dedupe keys
- Ethereal SMTP delivery with preview URLs
- Elasticsearch indexing and authenticated search
- Bull Board at `http://localhost:4000/admin/queues`
- Configurable worker concurrency, minimum delay, and hourly limits
- Idempotent worker claim using `scheduled -> processing -> sent`
- Slack OAuth and real Slack notification when hourly sender limits are reached

Frontend:
- Google login page
- Authenticated dashboard
- Scheduled and sent email tables
- Compose modal
- CSV/TXT upload and lead validation with PapaParse
- Slack connect/status/disconnect controls
- Loading, empty, error, and toast states

## Architecture

```text
React/Vite Frontend
   |
   v
Express API
   |
   +--> PostgreSQL via Prisma
   +--> Redis / BullMQ
   +--> Elasticsearch
   +--> Google OAuth
   +--> Slack OAuth
   |
   v
BullMQ Worker
   |
   +--> Redis Lua rate limiter
   +--> Redis Lua minimum send delay
   +--> Ethereal SMTP
   +--> Elasticsearch indexing
   +--> Slack Web API notifications
```

Controllers are thin; scheduling and delivery behavior lives in services, repositories, queues, workers, and integration modules under `apps/backend/src`.

## Scheduling

`POST /api/campaigns` validates the request, removes duplicate recipients, creates one `Email` row per recipient, then adds one BullMQ delayed job per row to the `email-send` queue. Job IDs are deterministic: `email-${emailId}`.

Initial scheduled times are calculated from campaign order:

```text
email 1 -> startTime
email 2 -> startTime + delaySeconds
email 3 -> startTime + 2 * delaySeconds
```

The worker still enforces the Redis-backed minimum delay and hourly limit at execution time. Calculated delays are not trusted as the only throttle.

## Persistence

PostgreSQL persists campaigns and emails. Redis persists BullMQ jobs through append-only persistence in `docker-compose.yml`.

On backend restart, the app does not loop through all scheduled emails and enqueue them again. Existing delayed jobs remain in Redis and workers reconnect. If reconciliation is ever added, it must check `Email.bullJobId` and BullMQ job existence before recreating a missing job.

## Idempotency

Before sending, the worker performs a conditional database claim:

```sql
UPDATE "Email"
SET status = 'processing'
WHERE id = $1 AND status = 'scheduled'
```

If zero rows are updated, another worker already claimed or completed the email, so the job exits without sending. If the email is already `sent`, the job exits immediately.

There is one unavoidable distributed-system edge case: if SMTP accepts the message and the process crashes before PostgreSQL records `sent`, a retry may send again. Production systems reduce this with provider idempotency keys or transactional outbox support when the mail provider supports it. Ethereal SMTP does not provide a true delivery idempotency key.

## Rate Limiting

Hourly limits use a Redis Lua script, not process memory. Keys are sender scoped:

```text
email:rate:{sender}:{YYYYMMDDHH}
```

The script atomically checks the current count and increments only if the count is below the effective limit. The effective limit is:

```text
min(campaign.hourlyLimit, MAX_EMAILS_PER_HOUR)
```

When the hourly limit is reached, the email is returned to `scheduled`, its `scheduledAt` is moved to the next available hour window, and the active BullMQ job is moved back to delayed state with `job.moveToDelayed(...)`. The job is not permanently failed.

Slack notification spam is prevented with:

```text
slack:rate-limit-notified:{sender}:{hourWindow}
```

Only the worker that wins `SET NX` sends the Slack API message.

## Minimum Delay

`MIN_SEND_DELAY_SECONDS` defaults to `2`. A Redis Lua script uses Redis server time and the key `email:send:last` to reserve the next global send slot safely across multiple worker instances.

## Concurrency

Worker concurrency is configured by `WORKER_CONCURRENCY`, default `5`.

For 1000+ emails scheduled at the same start time, BullMQ holds delayed jobs and workers process according to concurrency, minimum delay, and hourly sender limits. Lower `sequenceNumber` values are prioritized when jobs are initially enqueued. Absolute global ordering across many worker processes is not guaranteed because strict global ordering would reduce throughput.

## Elasticsearch

The app creates an `emails` index with fields:

```text
id, userId, campaignId, recipient, subject, body, status, scheduledAt, sentAt, createdAt
```

Emails are indexed when scheduled and updated after sent/failed state changes. If Elasticsearch is unavailable, sending does not fail; the error is logged and PostgreSQL remains source of truth. Search falls back to PostgreSQL if Elasticsearch search fails.

## Slack

Create a Slack app and configure:

```text
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=http://localhost:4000/api/slack/callback
SLACK_NOTIFICATION_CHANNEL=#general
```

Required scopes:

```text
chat:write
chat:write.public
```

Dashboard users connect through `GET /api/slack/connect`. Disconnecting deactivates the connection; rate limiting continues normally and notifications are skipped.

## Google OAuth

Create OAuth credentials in Google Cloud Console and configure:

```text
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
```

Authorized JavaScript origin:

```text
http://localhost:5173
```

Authorized redirect URI:

```text
http://localhost:4000/api/auth/google/callback
```

## Ethereal

Set Ethereal credentials explicitly:

```text
ETHEREAL_HOST=smtp.ethereal.email
ETHEREAL_PORT=587
ETHEREAL_USER=
ETHEREAL_PASSWORD=
```

If credentials are omitted in development, the backend creates a temporary Ethereal test account automatically. Preview URLs are logged and stored on sent emails when Nodemailer provides them.

## Environment Variables

See `.env.example` for the complete list:

```text
NODE_ENV
PORT
FRONTEND_URL
SESSION_SECRET
DATABASE_URL
REDIS_HOST
REDIS_PORT
REDIS_PASSWORD
ELASTICSEARCH_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL
SLACK_CLIENT_ID
SLACK_CLIENT_SECRET
SLACK_REDIRECT_URI
SLACK_NOTIFICATION_CHANNEL
ETHEREAL_HOST
ETHEREAL_PORT
ETHEREAL_USER
ETHEREAL_PASSWORD
SENDERS_JSON
WORKER_CONCURRENCY
MIN_SEND_DELAY_SECONDS
MAX_EMAILS_PER_HOUR
LOG_LEVEL
```

Never commit `.env`.

## Running Locally

Start infrastructure:

```bash
docker compose up -d
```

Install dependencies:

```bash
npm install
```

Generate Prisma and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Start API:

```bash
npm run dev -w @reachinbox/backend
```

Start worker:

```bash
npm run worker -w @reachinbox/backend
```

Start frontend:

```bash
npm run dev -w @reachinbox/frontend
```

Open:

```text
http://localhost:5173
```

## Bull Board

Bull Board is mounted at:

```text
http://localhost:4000/admin/queues
```

The route is protected by the same auth cookie as the API.

## API

Auth:
- `GET /api/auth/google`
- `GET /api/auth/google/callback`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Campaigns:
- `POST /api/campaigns`
- `GET /api/campaigns`
- `GET /api/campaigns/:id`

Emails:
- `GET /api/emails/scheduled`
- `GET /api/emails/sent`
- `GET /api/emails/search?q=...`
- `GET /api/emails/:id`

Slack:
- `GET /api/slack/connect`
- `GET /api/slack/callback`
- `GET /api/slack/status`
- `POST /api/slack/disconnect`

Health:
- `GET /api/health`

## Testing

```bash
npm run build
npm run lint
npm run test
```

Current tests cover campaign creation behavior, email validation, CSV parsing, scheduling calculations, worker idempotency, worker rescheduling, Redis Lua wrapper behavior, Slack notification dedupe, auth middleware, and Elasticsearch search calls.

With PostgreSQL and Redis running, the opt-in infrastructure test exercises BullMQ, Prisma, Redis, and the worker together:

```bash
RUN_INFRA_TESTS=true npm run test -w @reachinbox/backend
```

## Restart Demo

1. Start PostgreSQL, Redis, and Elasticsearch with `docker compose up -d`.
2. Run `npm run prisma:migrate`.
3. Start the API and worker.
4. Login with Google.
5. Schedule a campaign for a future time.
6. Stop the API and worker only. Leave PostgreSQL and Redis running.
7. Start the API and worker again before the scheduled time.
8. The worker reconnects to Redis, BullMQ releases the delayed job at the scheduled time, and PostgreSQL records the email as `sent`.
9. Check `/api/emails/sent` and Bull Board. The email should have a single row and a single deterministic BullMQ job id.

## Design Note

The supplied Figma URL was not accessible from this environment during implementation, so the frontend follows the requested information architecture and a clean outbound-operations style rather than claiming pixel-perfect fidelity.
