🚀 ReachInbox Full-stack Email Job Scheduler
Production-grade, highly resilient Email Job Scheduling Service and Frontend Dashboard built for ReachInbox.

Tech Stack: React, TypeScript, Vite, Tailwind CSS, Express.js, Prisma, PostgreSQL, BullMQ, Redis, Elasticsearch, Nodemailer (Ethereal Fake SMTP), Google Identity Services, Slack OAuth.

🛠️ System Architecture & Mechanics

  +-----------------------+              +------------------------+
   |  React + Vite Dashboard|  =======>    |   Express API Server   |
  |  (Tailwind CSS + TS)  |  <=======    |   (Auth, Schedule, ES) |
  +-----------------------+              +------------------------+
              |                                       |
              v                                       v
    +-------------------+                   +------------------+
    | Elasticsearch 8.x |                   | PostgreSQL (DB)  |
    | (Fuzzy Email Search)|                 | (Prisma Models)  |
    +-------------------+                   +------------------+
                                                      |
                                                      v
                                            +-------------------+
                                            | BullMQ Queue      |
                                            | (Redis Delayed)   |
                                            +-------------------+
                                                      |
                                                      v
                                            +-------------------+
                                            | Worker Pool (x5)  |
                                            +-------------------+
                                            /         |         \
                                           /          |          \
                             Rate Limit Hit           |          Rate Limit OK
                                   /                  |                \
                                  v                   v                 v
                       +------------------+  +-----------------+  +-----------------+
                       | Reschedule Job   |  | Slack Live Alert|  | Ethereal SMTP   |
                       | to Next Hour Win |  | (Incoming Webhk)|  | (Fake Sending)  |
                       +------------------+  +-----------------+  +-----------------+
🔑 Key Features & Technical Guarantees
1. Persistent Scheduling without Crons (Hard Constraint)
Zero OS or Node Cron: Absolutely no crontab, node-cron, or agenda libraries used.
BullMQ Delayed Jobs: All scheduled emails are transformed into BullMQ delayed jobs with calculated delay milliseconds (delay = targetTimestamp - Date.now()).
Server Restart Resilience: Delayed job timestamps and state are durably persisted in Redis queue state and PostgreSQL database. If the server or worker restarts while Redis data is retained, pending jobs resume at their target timestamps without rebuilding the queue from scratch.
Idempotency Guarantee: BullMQ jobId is set strictly to emailJob.id. Duplicate calls with the same ID are safely ignored by BullMQ and database constraints.
2. Throughput, Rate Limiting & Concurrency
Worker Concurrency: Configurable concurrent job processing via WORKER_CONCURRENCY env variable (default: 5). Multiple jobs execute safely in parallel.
Minimum Inter-Email Throttling: Configurable delay between individual sends (default: 2 seconds) to mimic provider throttling and avoid spam flags.
Atomic Hourly Rate Limiting: Enforced per-sender via Redis Lua counter reservations keyed by sender and UTC hour.
Zero Job Loss on Limit Exceeded: When a sender hits their hourly limit (e.g. 100 emails/hour), jobs are never dropped or failed. They are automatically rescheduled into the top of the next available hour window with random jitter.
Live Slack Alerts: Slack OAuth installs an incoming webhook for a selected channel. The first rate-limit hit per sender/hour sends a live alert; disconnected Slack does not interrupt scheduling.
3. Elasticsearch Multi-Field Search
Scheduled and Sent emails are automatically indexed into Elasticsearch index emails.
The dashboard search bar performs live debounced fuzzy multi-match searching across recipient lead email, subject, and body text.
4. React Dashboard
Google Login: Google Identity Services returns an ID token; the backend verifies it and issues a signed bearer session. User identity is derived from that session, not request-supplied IDs.
Main Dashboard Header: User info, Google email, Logout, Live BullMQ Board link (/admin/queues), and Slack connection status badge.
CSV / TXT Lead File Parser: Drag & drop or file upload for lead files with auto-regex detection and live lead counter badge.
Scheduled & Sent Emails Data Tables: Complete with status badges (SCHEDULED, SENT, FAILED, RATE_LIMITED_DELAYED), scheduled date, sent date, and clickable Ethereal preview links.
🚀 Quick Start Guide
Prerequisites
Node.js v18+ & npm
Docker Desktop with Linux containers, or local PostgreSQL, Redis, and Elasticsearch

OAuth Setup
1. Google Cloud Console: create a Web OAuth client, add `http://localhost:5173` as an authorized JavaScript origin, then set the same client ID in `backend/.env` (`GOOGLE_CLIENT_ID`) and `frontend/.env` (`VITE_GOOGLE_CLIENT_ID`).
2. Slack API: create an app, add `http://localhost:5000/api/slack/oauth/callback` under OAuth & Permissions redirect URLs, enable the `incoming-webhook` and `chat:write` bot scopes, and install the app in your workspace. Put its client ID and secret in `backend/.env`.
3. Set `JWT_SECRET` to a random value of at least 32 characters. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

Step 1: Start Container Infrastructure
bash

docker compose up -d
This launches:

PostgreSQL: localhost:5432 (reachinbox_email_db)
Redis: localhost:6379
Elasticsearch: localhost:9200
Step 2: Configure & Start Backend
If needed, copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env`; set the OAuth credentials described above.
Navigate to backend directory:
bash

cd backend
Install dependencies:
bash

npm install
Initialize Database Schema (Prisma):
bash

npx prisma db push
Start Backend Server:
bash

npm run dev
The backend runs at http://localhost:5000. BullMQ Dashboard available at http://localhost:5000/admin/queues.
Step 3: Start Frontend
Open a new terminal and navigate to frontend directory:
bash

cd frontend
Install dependencies:
bash

npm install
Start the Vite development server:
bash

npm run dev
Open your browser at http://localhost:5173.
⚙️ Environment Variables Reference
Backend (backend/.env)
Variable	Default Value	Description
PORT	5000	Express API port
DATABASE_URL	postgresql://postgres:postgrespassword@127.0.0.1:5432/reachinbox_email_db?schema=public	PostgreSQL connection string
JWT_SECRET	A random secret of at least 32 characters	Signs API bearer sessions
GOOGLE_CLIENT_ID	Google OAuth Web client ID	Must match the frontend client ID
SLACK_CLIENT_ID	Slack app client ID	Starts Slack OAuth
SLACK_CLIENT_SECRET	Slack app client secret	Exchanges Slack OAuth code
SLACK_REDIRECT_URI	http://localhost:5000/api/slack/oauth/callback	Register this URL in the Slack app
FRONTEND_URL	http://localhost:5173	Frontend URL used after Slack OAuth
REDIS_HOST	localhost	Redis server hostname
REDIS_PORT	6379	Redis port
REDIS_URL	Unset locally; set the hosted Redis connection URL on Render	When set, overrides REDIS_HOST/REDIS_PORT and supports `redis://` or TLS `rediss://` URLs
ELASTICSEARCH_NODE	http://localhost:9200	Elasticsearch endpoint
WORKER_CONCURRENCY	5	Concurrency level of BullMQ workers
DEFAULT_HOURLY_LIMIT	100	Default hourly limit per sender
DEFAULT_DELAY_SECONDS	2	Minimum inter-email send delay in seconds
Frontend (frontend/.env)
Variable	Default Value	Description
VITE_API_URL	https://outreach-assign.onrender.com/api	Backend API URL (override for local development with http://localhost:5000/api)
VITE_GOOGLE_CLIENT_ID	Google OAuth Web client ID	Register http://localhost:5173 as an authorized JavaScript origin
VITE_DEFAULT_HOURLY_LIMIT	100	Default per-campaign sender limit
VITE_DEFAULT_DELAY_SECONDS	2	Default per-email minimum gap
🧪 Verification & Feature Mapping
Requirement	Implementation Detail	Status
No Crons	Uses BullMQ delayed jobs with Redis persistence (emailQueue.add(..., { delay }))	✅ Pass
Persistence on Restart	Job state saved in PostgreSQL (EmailJob) & BullMQ delay keys in Redis	✅ Pass
Worker Concurrency	Configurable worker pool (WORKER_CONCURRENCY=5)	✅ Pass
Rate Limiting	Atomic Redis Lua reservations keyed by sender and UTC hour with 2h TTL	✅ Pass
Rate Limit Action	Automatic job delay to next hour window + Slack alert (no dropped jobs)	✅ Pass
Slack Integration	OAuth-installed incoming webhook sends live hourly-limit alerts	✅ Pass
Elasticsearch	Indexed on creation & update; fuzzy multi-field search API endpoint	✅ Pass
BullMQ Board	@bull-board/express router mounted live at /admin/queues	✅ Pass
Google Login	Google Identity Services ID-token verification and signed bearer sessions	✅ Pass
Figma UI & CSV Upload	Modern Tailwind CSS design with PapaParse CSV lead count detector	✅ Pass
📝 Trade-offs & Assumptions
Ethereal Fake SMTP: Ethereal test accounts are generated dynamically per sender, allowing instant preview of delivered HTML email bodies via generated Ethereal message URLs.
Elasticsearch Fallback: If Elasticsearch is starting up or indexing, search queries fall back to PostgreSQL text-field matching scoped to the authenticated user.
Slack OAuth: Requires an app with `incoming-webhook` and `chat:write` scopes and the registered redirect URL from `SLACK_REDIRECT_URI`. Slack must be configured by the workspace owner before the OAuth button can be used.
Load behavior: 1,000 recipients become 1,000 durable BullMQ delayed jobs. Configured worker concurrency bounds active work; Redis atomically reserves each sender's hourly quota and send slot. Jobs over quota are moved to the next UTC hour and are not discarded.
SMTP idempotency: BullMQ IDs and persisted `SENT` state prevent normal duplicate enqueue/retry processing. SMTP itself has no transactional idempotency key, so a process crash after the SMTP server accepts a message but before PostgreSQL records `SENT` cannot be proven exactly-once; this is an inherent boundary of SMTP.
Database migration: this assignment uses PostgreSQL. Existing data in the previous MongoDB deployment is not migrated by `prisma db push`.