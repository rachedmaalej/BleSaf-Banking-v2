# BléSaf Banking — Implementation Plan

> Fresh build in `C:\Users\rache\CCProjects\BléSaf - Banking\`

## Phase 1: Project Scaffolding

### 1.1 Monorepo setup
- pnpm workspace with `apps/api`, `apps/web`, `packages/shared`
- Root `package.json`, `pnpm-workspace.yaml`, `.gitignore`
- TypeScript config: root `tsconfig.base.json`, per-app extends

### 1.2 Backend (`apps/api`)
- **Runtime:** Node.js + Express + TypeScript
- **Files to create:**
  - `src/index.ts` — Express server + Socket.IO setup
  - `src/config/index.ts` — env vars (PORT, DATABASE_URL, REDIS_URL, JWT_SECRET)
  - `src/middleware/auth.ts` — JWT verification + role extraction
  - `src/middleware/tenant.ts` — resolve tenant from subdomain/header, set Prisma schema
  - `src/middleware/rbac.ts` — role-based access guard (`requireRole('branch_manager')`)
  - `package.json` with: express, socket.io, prisma, @prisma/client, jsonwebtoken, bcryptjs, redis (ioredis), cors, helmet, zod

### 1.3 Database (Prisma)
- `apps/api/prisma/schema.prisma` — full schema (see Data Model below)
- Seed script: `prisma/seed.ts` — demo tenant, branch, counters, services, users
- **Models:** Tenant, Branch, Counter, CounterService (join), ServiceCategory, Ticket, User, DailyBranchStats, HourlySnapshot, AuditLog

### 1.4 Frontend (`apps/web`)
- **Runtime:** React 18 + TypeScript + Vite
- **Dependencies:** tailwindcss, @headlessui/react, socket.io-client, react-router-dom, react-i18next, zustand, qrcode.react, axios
- **Tailwind config:** RTL plugin (`tailwindcss-rtl`), custom banking color palette
- **i18n:** `src/i18n/` with `ar.json` and `fr.json` locale files
- **Router structure:** see Screens below

### 1.5 Shared package (`packages/shared`)
- `types.ts` — shared TypeScript interfaces (Ticket, Branch, Counter, etc.)
- `constants.ts` — ticket statuses, roles, notification channels
- `validation.ts` — shared Zod schemas for API payloads

---

## Phase 2: Auth & Multi-Tenancy

### 2.1 Auth system
- **Routes:** `src/routes/auth.ts`
  - `POST /api/auth/login` — email + password → JWT access (15min) + refresh token (7d)
  - `POST /api/auth/refresh` — refresh token → new access token
  - `POST /api/auth/logout` — invalidate refresh token
- **JWT payload:** `{ userId, tenantId, branchId, role }`
- **Password:** bcryptjs hash, 12 rounds

### 2.2 Multi-tenant middleware
- Tenant resolved from: `x-tenant-id` header (API) or subdomain (web)
- Middleware sets `req.tenantId` and switches Prisma to tenant schema
- **Schema isolation:** For MVP, use `tenant_id` column (row-level). Schema-per-tenant deferred to post-MVP — simpler to develop, same Prisma schema, easier migrations.
- Every query filtered by `tenant_id` via Prisma middleware

### 2.3 RBAC
- Roles: `super_admin | bank_admin | branch_manager | teller`
- `requireRole(...roles)` middleware on each route
- Tellers scoped to their branch, bank_admin sees all branches in tenant

### 2.4 Admin APIs
- `src/routes/admin.ts`
  - CRUD: tenants (super_admin only)
  - CRUD: branches, users, service categories (bank_admin+)
  - Counter management (branch_manager+)

---

## Phase 3: Core Queue Engine

### 3.1 Ticket APIs (`src/routes/queue.ts`)
- `POST /api/queue/checkin` — create ticket (service_category_id, branch_id, phone?, channel?)
  - Generates ticket number: prefix (from service) + daily sequential (A-001)
  - Returns: ticket with QR code URL (`/status/:ticketId`)
  - Public endpoint (no auth — kiosk/customer)
- `POST /api/queue/call-next` — teller calls next ticket (auth: teller)
  - FIFO per service, VIP priority override
  - Smart routing: if counter serves multiple services, pick longest-waiting
  - Updates ticket status: waiting → called
  - Emits Socket.IO event to branch room
- `POST /api/queue/:ticketId/serve` — mark as serving
- `POST /api/queue/:ticketId/complete` — mark as completed, record service_time
- `POST /api/queue/:ticketId/no-show` — mark as no_show
- `POST /api/queue/:ticketId/transfer` — transfer to different service category
- `GET /api/queue/branch/:branchId/status` — public: current queue state for display
- `GET /api/queue/ticket/:ticketId/status` — public: single ticket position + wait estimate

### 3.2 Queue logic (`src/services/queueService.ts`)
- **Ticket numbering:** Per-branch, per-service prefix, daily reset (check date of last ticket)
- **Wait estimation:** `avg_service_time × position_in_queue`
- **Position calculation:** Count waiting tickets in same service created before this one

### 3.3 Redis layer (`src/services/redisService.ts`)
- Cache current queue state per branch: `queue:{branchId}` → sorted set of waiting tickets
- Pub/Sub: publish queue events, subscribe in Socket.IO layer
- TTL: queue state expires at end of day

### 3.4 WebSocket (`src/socket/index.ts`)
- Socket.IO server attached to Express
- **Rooms:** `branch:{branchId}` — all clients in that branch join
- **Events emitted:**
  - `ticket:created` — new ticket in queue
  - `ticket:called` — ticket called to counter
  - `ticket:completed` — service finished
  - `ticket:no-show` — customer didn't show
  - `queue:updated` — full queue state refresh
- **Events received:**
  - `join:branch` — client joins branch room
  - `join:ticket` — customer tracks specific ticket

---

## Phase 4: Frontend Apps

### 4.1 Kiosk App (`/kiosk/:branchId`)
- `src/pages/kiosk/KioskServiceSelect.tsx` — grid of service categories (icons + AR/FR labels)
- `src/pages/kiosk/KioskTicketConfirm.tsx` — ticket number, position, wait estimate, QR code (links to `/status/:ticketId`), optional phone input for SMS/WhatsApp
- Auto-redirect to service select after 10s
- Fullscreen-friendly, large touch targets

### 4.2 Mobile Queue Entry (`/join/:branchId`)
- `src/pages/mobile/MobileServiceSelect.tsx` — customer scans QR at branch entrance, selects service on phone
- `src/pages/mobile/MobileTicketView.tsx` — virtual ticket with live position (WebSocket)
- Responsive, no auth needed

### 4.3 Ticket Status Page (`/status/:ticketId`)
- `src/pages/status/TicketStatus.tsx` — live position, wait estimate, ticket info
- WebSocket: joins `ticket:{ticketId}` room for real-time updates
- Public, no auth

### 4.4 Queue Display (`/display/:branchId`)
- `src/pages/display/QueueDisplay.tsx` — fullscreen, now-serving grid (counter ↔ ticket), next tickets
- Audio chime on `ticket:called` event
- WebSocket: joins `branch:{branchId}` room
- No auth, designed for TV

### 4.5 Teller Dashboard (`/teller`)
- `src/pages/teller/TellerDashboard.tsx` — login required (teller role)
  - Current ticket with service timer
  - "Call Next" / "Complete" / "No Show" / "Transfer" buttons
  - Next 3-5 tickets preview
  - Minimal UI for speed

### 4.6 Branch Manager Dashboard (`/manager`)
- `src/pages/manager/BranchDashboard.tsx` — login required (branch_manager+)
  - Real-time: all counters, queue lengths, wait times
  - Per-agent stats: clients served, avg service time, productivity
  - Counter management: open/close, reassign services
  - Alerts: long waits, idle counters
  - Today's summary

### 4.7 HQ Admin Portal (`/admin`)
- `src/pages/admin/HQDashboard.tsx` — login required (bank_admin+)
  - Multi-branch list with live status (green/yellow/red)
  - Branch comparison analytics
  - Config: branches, users, services, branding
- `src/pages/admin/AdminUsers.tsx` — user CRUD
- `src/pages/admin/AdminBranches.tsx` — branch CRUD
- `src/pages/admin/AdminServices.tsx` — service category config

### 4.8 Auth Pages
- `src/pages/auth/LoginPage.tsx`
- Zustand store: `src/stores/authStore.ts`

### 4.9 Shared Components
- `src/components/ui/` — Button, Card, Modal, Badge, Input (Tailwind + Headless UI)
- `src/components/layout/` — AppShell, Sidebar, Header (RTL-aware)
- `src/components/queue/` — TicketCard, QueueList, CounterStatusBadge

---

## Phase 5: Notifications (SMS + WhatsApp)

### 5.1 Notification service (`src/services/notificationService.ts`)
- Abstract interface: `sendTicketConfirmation()`, `sendAlmostYourTurn()`, `sendYourTurn()`
- Channel selection: based on customer preference (sms | whatsapp | none)
- Fallback: WhatsApp fail → retry via SMS

### 5.2 SMS provider (`src/services/smsProvider.ts`)
- Twilio SDK integration
- Send ticket confirmation, "almost your turn" (N-2 configurable), "your turn — Counter X"

### 5.3 WhatsApp provider (`src/services/whatsappProvider.ts`)
- Meta Cloud API / Twilio WhatsApp
- Pre-approved template messages (Meta requirement)
- Same 3 message types as SMS

### 5.4 Notification triggers
- On ticket creation → send confirmation
- On queue position reaching threshold → send "almost your turn"
- On `ticket:called` → send "your turn"
- Triggered from queueService, async (don't block API response)

---

## Phase 6: Analytics

### 6.1 Stats aggregation (`src/services/statsService.ts`)
- On ticket completion: update running daily stats
- Hourly snapshot: cron job every hour captures queue_length, active_counters, avg_wait
- Per-agent stats: derived from tickets (served_by_user_id)

### 6.2 Analytics APIs (`src/routes/analytics.ts`)
- `GET /api/analytics/branch/:branchId/today` — today's live stats
- `GET /api/analytics/branch/:branchId/history` — date range
- `GET /api/analytics/branch/:branchId/agents` — per-agent performance
- `GET /api/analytics/tenant/overview` — all branches summary (HQ)
- `GET /api/analytics/tenant/compare` — branch comparison

---

## Prisma Schema (Key Models)

```prisma
model Tenant {
  id          String   @id @default(uuid())
  name        String
  subdomain   String   @unique
  logoUrl     String?
  primaryColor String?
  languageConfig Json  @default("{\"default\":\"fr\",\"available\":[\"fr\",\"ar\"]}")
  status      String   @default("active")  // active | suspended
  createdAt   DateTime @default(now())
  branches    Branch[]
  users       User[]
}

model Branch {
  id        String   @id @default(uuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  name      String
  code      String
  address   String?
  region    String?
  timezone  String   @default("Africa/Tunis")
  status    String   @default("active")
  counters  Counter[]
  services  ServiceCategory[]
  tickets   Ticket[]
}

model Counter {
  id              String   @id @default(uuid())
  branchId        String
  branch          Branch   @relation(fields: [branchId], references: [id])
  number          Int
  label           String?
  status          String   @default("closed")  // open | closed | paused
  currentTicketId String?  @unique
  currentTicket   Ticket?  @relation("CurrentTicket", fields: [currentTicketId], references: [id])
  assignedServices CounterService[]
  tickets         Ticket[] @relation("ServedAt")
}

model ServiceCategory {
  id             String   @id @default(uuid())
  branchId       String
  branch         Branch   @relation(fields: [branchId], references: [id])
  nameAr         String
  nameFr         String
  prefix         String   // A, B, C... for ticket numbering
  icon           String?
  priorityWeight Int      @default(1)
  avgServiceTime Int      @default(10)  // minutes
  isActive       Boolean  @default(true)
  counters       CounterService[]
  tickets        Ticket[]
}

model CounterService {
  counterId  String
  counter    Counter         @relation(fields: [counterId], references: [id])
  serviceId  String
  service    ServiceCategory @relation(fields: [serviceId], references: [id])
  @@id([counterId, serviceId])
}

model Ticket {
  id                String   @id @default(uuid())
  branchId          String
  branch            Branch   @relation(fields: [branchId], references: [id])
  serviceCategoryId String
  serviceCategory   ServiceCategory @relation(fields: [serviceCategoryId], references: [id])
  ticketNumber      String   // "A-042"
  status            String   @default("waiting") // waiting|called|serving|completed|no_show|cancelled
  priority          String   @default("normal")  // normal | vip
  customerPhone     String?
  notificationChannel String? // none | sms | whatsapp
  counterId         String?
  counter           Counter? @relation("ServedAt", fields: [counterId], references: [id])
  servedByUserId    String?
  servedBy          User?    @relation(fields: [servedByUserId], references: [id])
  createdAt         DateTime @default(now())
  calledAt          DateTime?
  servingStartedAt  DateTime?
  completedAt       DateTime?
  notes             String?
  currentAtCounter  Counter? @relation("CurrentTicket")
}

model User {
  id           String   @id @default(uuid())
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  branchId     String?
  name         String
  email        String   @unique
  passwordHash String
  role         String   // super_admin | bank_admin | branch_manager | teller
  status       String   @default("active")
  tickets      Ticket[]
}
```

---

## Implementation Order

Execute in this order — each step builds on the previous:

1. **Scaffold** — monorepo, packages, configs, deps
2. **Prisma schema** — all models, migrate, seed
3. **Auth** — login, JWT, RBAC middleware, tenant middleware
4. **Admin CRUD** — branches, counters, services, users
5. **Queue engine** — checkin, call-next, complete, no-show, transfer + Redis
6. **WebSocket** — Socket.IO rooms, events, real-time broadcast
7. **Frontend: auth + layout** — login page, app shell, router, i18n, stores
8. **Frontend: kiosk + mobile entry** — service select, ticket confirm, QR
9. **Frontend: ticket status** — live tracking page
10. **Frontend: display** — TV fullscreen now-serving board
11. **Frontend: teller** — call/complete/transfer dashboard
12. **Frontend: branch manager** — real-time overview, counter mgmt, agent stats
13. **Frontend: HQ admin** — multi-branch, config, user mgmt
14. **Notifications** — SMS + WhatsApp service with fallback
15. **Analytics** — stats aggregation, analytics APIs, dashboard charts

---

## Verification

- **Manual test:** Full flow — create tenant/branch/service → kiosk checkin → teller calls → display updates → ticket status updates → complete
- **WebSocket test:** Open display + teller + status pages, verify all update in real-time when actions taken
- **Auth test:** Verify teller can't access manager routes, manager can't access other branches
- **RTL test:** Switch to Arabic, verify layout mirrors correctly
- **QR test:** Kiosk ticket QR → opens status page on mobile; branch entrance QR → opens mobile service select
