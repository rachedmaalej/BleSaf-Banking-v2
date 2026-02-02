# BléSaf — Queue Management System for Banks

> **"Blé" = sans · "Saf" = file → Sans File d'Attente** (No More Waiting in Line)

BléSaf is a cloud-based, multi-tenant SaaS platform for managing customer queues in bank branches across Tunisia and North Africa. It replaces outdated ticket systems with a modern, real-time solution that benefits customers, tellers, branch managers, and bank headquarters.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution Overview](#solution-overview)
3. [Target Market](#target-market)
4. [Core User Flows](#core-user-flows)
5. [User Roles & Dashboards](#user-roles--dashboards)
6. [Key Features](#key-features)
7. [Technical Architecture](#technical-architecture)
8. [Data Model](#data-model)
9. [API Design](#api-design)
10. [Real-Time Communication](#real-time-communication)
11. [Notifications](#notifications)
12. [Analytics & Reporting](#analytics--reporting)
13. [Internationalization](#internationalization)
14. [Deployment & Infrastructure](#deployment--infrastructure)
15. [Security & Multi-Tenancy](#security--multi-tenancy)
16. [Differentiators](#differentiators)
17. [Business Model](#business-model)
18. [Implementation Phases](#implementation-phases)

---

## Problem Statement

### The Customer Experience Problem

In Tunisian bank branches today, customers face one of two frustrating scenarios:

1. **No system at all** — Customers physically stand in line, often for 30-60+ minutes, with no visibility into wait times or their position.

2. **Basic ticket dispensers** — Customers take a numbered ticket and must remain standing in front of a display screen to monitor when their number is called. There is:
   - No way to track position on their phone
   - No estimated wait time
   - No notification when their turn approaches
   - No ability to step out (for coffee, errands) without missing their turn

### The Bank Operations Problem

Branch managers operate blind:

- **No wait time metrics** — Cannot measure or report average customer wait times
- **No agent productivity data** — Cannot track how many customers each teller serves or their average service time
- **No peak hour analysis** — Cannot identify busy periods to optimize staffing
- **No cross-branch visibility** — Headquarters cannot compare branch performance or identify bottlenecks

---

## Solution Overview

BléSaf is a **100% cloud-based** queue management platform that transforms the bank branch experience:

### For Customers
- **Two check-in options**: Touch a kiosk screen OR scan a QR code with their phone
- **Real-time tracking**: View queue position and estimated wait time on their mobile device
- **Proactive notifications**: Receive SMS/WhatsApp alerts when their turn approaches and when called
- **Freedom to wait elsewhere**: Leave the waiting area (café, car, outside) and return just in time

### For Tellers/Agents
- **Simple dashboard**: One-click actions — Call Next, Complete, No-Show, Transfer
- **Personal login**: Each agent's activity is tracked for performance analytics
- **Service timer**: Real-time tracking of current service duration

### For Branch Managers
- **Live operations view**: See all counters, current tickets, queue lengths in real-time
- **Agent performance**: Clients served, average service time, productivity metrics per teller
- **Alerts**: Notifications for long waits, idle counters, or queue buildup
- **Counter management**: Open/close counters, reassign services dynamically

### For Bank Headquarters
- **Multi-branch dashboard**: Monitor all branches with color-coded status (green/yellow/red)
- **Comparative analytics**: Compare performance across branches
- **Centralized configuration**: Manage services, users, and branding from one portal

---

## Target Market

### Primary Market
- **Banks in Tunisia** — Starting with independent banks and expanding to larger networks
- **Branch networks of 50-200 branches** — Optimal scale for the platform's multi-tenant architecture

### Secondary Markets
- **Banks in North Africa** — Morocco, Algeria, Libya (Arabic + French bilingual support)
- **Other financial institutions** — Insurance companies, microfinance institutions

### Typical Client Profile
- Regional or national bank with 80-150 branches
- Currently using basic ticket dispensers or no system
- Looking to improve customer satisfaction scores
- Seeking operational data for optimization

---

## Core User Flows

### Flow A: Customer Check-in via Kiosk

```
Customer arrives → Touches kiosk screen → Selects service category
→ Receives printed ticket (number + QR code + wait estimate)
→ Scans QR to track on phone (optional) → Waits
→ Receives "almost your turn" notification → Approaches counter
→ Sees/hears their number called → Goes to counter X
```

### Flow B: Customer Check-in via Mobile QR

```
Customer arrives → Scans QR code displayed at branch entrance
→ Selects service category on phone → Receives virtual ticket
→ Sees real-time position + wait estimate on phone → Waits anywhere
→ Receives "almost your turn" notification → Heads to branch
→ Receives "your turn — Counter X" notification → Goes directly to counter
```

### Flow C: Teller Workflow

```
Teller logs in with credentials → Dashboard shows next tickets
→ Clicks "Call Next" → Customer assigned + notification sent
→ Serves customer → Clicks "Complete" (or "No-Show" / "Transfer")
→ Service time recorded → Next customer auto-queued
```

### Flow D: Branch Manager Operations

```
Manager logs in → Sees real-time overview of all counters
→ Monitors queue lengths, wait times, alerts
→ Opens/closes counters as needed → Reviews agent stats
→ Exports daily report
```

### Flow E: HQ Oversight

```
Bank admin logs in → Sees all-branch status map
→ Drills into underperforming branches → Reviews comparative analytics
→ Manages users, services, branches → Configures bank branding
```

### Flow F: Display Screen

```
TV in waiting area → Shows "Now Serving" grid (counter → ticket)
→ Shows next tickets in queue → Plays audio chime on call
→ Updates in real-time via WebSocket
```

---

## User Roles & Dashboards

| Role | Scope | Dashboard Features |
|------|-------|-------------------|
| **Super Admin** | Platform-wide | Tenant (bank) management, system health |
| **Bank Admin** | Single tenant (bank) | All branches, users, services, analytics |
| **Branch Manager** | Single branch | Real-time ops, counters, agent stats, alerts |
| **Teller/Agent** | Single counter | Call/complete/transfer, current queue preview |
| **Customer** | Their ticket | Position, wait time, notifications |

### Dashboard URLs

| Dashboard | URL Pattern | Auth Required |
|-----------|-------------|---------------|
| Kiosk | `/kiosk/:branchId` | No |
| Mobile Check-in | `/join/:branchId` | No |
| Ticket Status | `/status/:ticketId` | No |
| Display Screen | `/display/:branchId` | No |
| Teller | `/teller` | Yes (teller role) |
| Branch Manager | `/manager` | Yes (branch_manager+) |
| HQ Admin | `/admin` | Yes (bank_admin+) |
| Login | `/login` | No |

---

## Key Features

### Customer-Facing

| Feature | Description |
|---------|-------------|
| **Dual check-in** | Kiosk touchscreen OR mobile QR code scan |
| **Service categories** | Select service type: Deposits, Withdrawals, Account Opening, Loans, Foreign Exchange, etc. |
| **Printed ticket** | Ticket number, service type, wait estimate, QR code for mobile tracking |
| **Virtual ticket** | Same info on phone for QR check-in users |
| **Live position tracking** | Real-time position in queue + estimated wait time |
| **Multi-channel notifications** | SMS and/or WhatsApp with automatic fallback |
| **Notification triggers** | Ticket confirmation, "almost your turn" (configurable N-2), "your turn — Counter X" |

### Teller/Agent

| Feature | Description |
|---------|-------------|
| **Personal login** | Each agent authenticates for tracking |
| **Quick actions** | Call Next, Complete, No-Show, Transfer (one click each) |
| **Service timer** | Duration counter for current service |
| **Queue preview** | See next 3-5 tickets waiting |
| **Transfer capability** | Redirect customer to different service queue |

### Branch Manager

| Feature | Description |
|---------|-------------|
| **Real-time operations** | Live view of all counters, queues, tickets |
| **Counter management** | Open/close/pause counters, assign services |
| **Agent statistics** | Per-agent: clients served, avg service time, productivity |
| **Alerts system** | Long wait alerts, idle counter alerts, queue length alerts |
| **Daily summary** | Automated end-of-day stats |

### HQ/Bank Admin

| Feature | Description |
|---------|-------------|
| **Multi-branch view** | All branches with status indicators |
| **Branch comparison** | Side-by-side performance analytics |
| **User management** | CRUD for all users across branches |
| **Service configuration** | Define service categories, prefixes, icons |
| **Branding** | Logo, colors, language preferences |

### Display Screen (TV)

| Feature | Description |
|---------|-------------|
| **Now Serving grid** | Counter number ↔ Ticket number mapping |
| **Next up list** | Upcoming tickets by service |
| **Audio chime** | Sound alert when ticket called |
| **Fullscreen mode** | Designed for TV display |
| **Auto-refresh** | WebSocket-powered real-time updates |

---

## Technical Architecture

### Stack Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│   React 18 + TypeScript + Vite + Tailwind CSS              │
│   Socket.io-client + Zustand + react-i18next               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                             │
│   Node.js + Express + TypeScript + Socket.IO               │
│   Prisma ORM + JWT Auth + RBAC Middleware                  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────────┐
        │PostgreSQL│   │  Redis   │   │ Twilio/Meta  │
        │ Database │   │  Cache   │   │ SMS/WhatsApp │
        └──────────┘   └──────────┘   └──────────────┘
```

### Project Structure (Monorepo)

```
blesaf-banking/
├── apps/
│   ├── api/                    # Node.js backend
│   │   ├── src/
│   │   │   ├── routes/         # Express route handlers
│   │   │   ├── services/       # Business logic
│   │   │   ├── middleware/     # Auth, RBAC, tenant
│   │   │   ├── socket/         # Socket.IO handlers
│   │   │   ├── config/         # Environment config
│   │   │   └── types/          # TypeScript types
│   │   └── prisma/
│   │       ├── schema.prisma   # Database schema
│   │       └── seed.ts         # Seed script
│   │
│   └── web/                    # React frontend
│       ├── src/
│       │   ├── pages/          # Route components
│       │   │   ├── kiosk/      # Kiosk check-in
│       │   │   ├── mobile/     # Mobile check-in
│       │   │   ├── status/     # Ticket tracking
│       │   │   ├── display/    # TV display
│       │   │   ├── teller/     # Teller dashboard
│       │   │   ├── manager/    # Branch manager
│       │   │   ├── admin/      # HQ admin portal
│       │   │   └── auth/       # Login page
│       │   ├── components/
│       │   │   ├── ui/         # Reusable UI
│       │   │   ├── layout/     # App shell, sidebar
│       │   │   └── queue/      # Queue-specific
│       │   ├── stores/         # Zustand state
│       │   ├── hooks/          # Custom hooks
│       │   ├── lib/            # Utils, API client
│       │   └── i18n/           # Translations
│       └── public/
│
├── packages/
│   └── shared/                 # Shared code
│       ├── types.ts            # TypeScript interfaces
│       ├── constants.ts        # Enums, status codes
│       └── validation.ts       # Zod schemas
│
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

### Technology Choices

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend Framework** | React 18 | Industry standard, large ecosystem |
| **Build Tool** | Vite | Fast dev server, optimized builds |
| **Styling** | Tailwind CSS | Rapid UI development, RTL plugin |
| **State Management** | Zustand | Lightweight, simple API |
| **Forms** | React Hook Form + Zod | Type-safe validation |
| **i18n** | react-i18next | Mature, RTL support |
| **Backend Runtime** | Node.js | JavaScript ecosystem consistency |
| **Backend Framework** | Express | Simple, well-documented |
| **Real-time** | Socket.IO | Reliable WebSocket abstraction |
| **Database** | PostgreSQL | Robust, relational, Prisma support |
| **ORM** | Prisma | Type-safe queries, migrations |
| **Cache** | Redis | Queue state caching, pub/sub |
| **Auth** | JWT | Stateless, scalable |
| **SMS** | Twilio | Reliable, Tunisia support |
| **WhatsApp** | Meta Cloud API | Official API, template messages |

---

## Data Model

### Entity Relationship Diagram (Simplified)

```
Tenant (Bank)
    │
    ├── Branch[] ─────────────────────┐
    │       │                         │
    │       ├── Counter[]             │
    │       │       │                 │
    │       │       └── CounterService[] ──┐
    │       │                              │
    │       ├── ServiceCategory[] ─────────┘
    │       │
    │       └── Ticket[]
    │               │
    └── User[] ─────┘ (serves tickets)
```

### Core Models

#### Tenant (Bank)
```
- id: UUID
- name: string (e.g., "Banque Nationale de Tunisie")
- subdomain: string (e.g., "bnt")
- logoUrl: string?
- primaryColor: string?
- languageConfig: JSON (default: fr, available: [fr, ar])
- status: active | suspended
- createdAt: timestamp
```

#### Branch
```
- id: UUID
- tenantId: FK → Tenant
- name: string (e.g., "Agence Lac 2")
- code: string (e.g., "LAC2")
- address: string?
- region: string?
- timezone: string (default: "Africa/Tunis")
- status: active | inactive
```

#### Counter (Guichet)
```
- id: UUID
- branchId: FK → Branch
- number: int (e.g., 1, 2, 3)
- label: string? (e.g., "Guichet Rapide")
- status: open | closed | paused
- currentTicketId: FK → Ticket? (currently serving)
```

#### ServiceCategory
```
- id: UUID
- branchId: FK → Branch
- nameAr: string (Arabic name)
- nameFr: string (French name)
- prefix: string (e.g., "A", "B", "C" for ticket numbering)
- icon: string? (emoji or icon name)
- priorityWeight: int (for VIP services)
- avgServiceTime: int (minutes, for wait estimation)
- isActive: boolean
```

#### CounterService (Join Table)
```
- counterId: FK → Counter
- serviceId: FK → ServiceCategory
```

#### Ticket
```
- id: UUID
- branchId: FK → Branch
- serviceCategoryId: FK → ServiceCategory
- ticketNumber: string (e.g., "A-042")
- status: waiting | called | serving | completed | no_show | cancelled
- priority: normal | vip
- customerPhone: string?
- notificationChannel: none | sms | whatsapp
- counterId: FK → Counter? (assigned counter)
- servedByUserId: FK → User? (teller who served)
- createdAt: timestamp (check-in time)
- calledAt: timestamp? (when called)
- servingStartedAt: timestamp? (service start)
- completedAt: timestamp? (service end)
- notes: string?
```

#### User
```
- id: UUID
- tenantId: FK → Tenant
- branchId: FK → Branch? (null for bank_admin/super_admin)
- name: string
- email: string (unique)
- passwordHash: string
- role: super_admin | bank_admin | branch_manager | teller
- status: active | inactive
```

---

## API Design

### Authentication Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Login with email/password | No |
| POST | `/api/auth/refresh` | Refresh access token | Refresh token |
| POST | `/api/auth/logout` | Invalidate refresh token | Yes |

### Queue Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/queue/checkin` | Create ticket (kiosk/mobile) | No |
| POST | `/api/queue/call-next` | Call next ticket | Teller |
| POST | `/api/queue/:id/serve` | Start serving ticket | Teller |
| POST | `/api/queue/:id/complete` | Complete service | Teller |
| POST | `/api/queue/:id/no-show` | Mark as no-show | Teller |
| POST | `/api/queue/:id/transfer` | Transfer to another service | Teller |
| GET | `/api/queue/branch/:id/status` | Get branch queue state | No |
| GET | `/api/queue/ticket/:id/status` | Get ticket position | No |

### Admin Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/branches` | List branches | Bank Admin |
| POST | `/api/branches` | Create branch | Bank Admin |
| PATCH | `/api/branches/:id` | Update branch | Bank Admin |
| GET | `/api/counters` | List counters | Branch Manager |
| POST | `/api/counters` | Create counter | Branch Manager |
| PATCH | `/api/counters/:id` | Update counter (open/close) | Branch Manager |
| GET | `/api/services` | List service categories | Bank Admin |
| POST | `/api/services` | Create service | Bank Admin |
| GET | `/api/users` | List users | Bank Admin |
| POST | `/api/users` | Create user | Bank Admin |

### Analytics Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/analytics/branch/:id/today` | Today's stats | Branch Manager |
| GET | `/api/analytics/branch/:id/history` | Historical stats | Branch Manager |
| GET | `/api/analytics/branch/:id/agents` | Agent performance | Branch Manager |
| GET | `/api/analytics/tenant/overview` | All branches summary | Bank Admin |
| GET | `/api/analytics/tenant/compare` | Branch comparison | Bank Admin |

---

## Real-Time Communication

### WebSocket Architecture

```
┌─────────────┐         ┌─────────────────────────────────┐
│   Client    │◄───────►│          Socket.IO Server       │
└─────────────┘         │                                 │
                        │  Rooms:                         │
                        │  - branch:{branchId}            │
                        │  - ticket:{ticketId}            │
                        │                                 │
                        │  Events:                        │
                        │  - ticket:created               │
                        │  - ticket:called                │
                        │  - ticket:completed             │
                        │  - ticket:no-show               │
                        │  - queue:updated                │
                        └─────────────────────────────────┘
```

### Events Emitted (Server → Client)

| Event | Payload | Sent To |
|-------|---------|---------|
| `ticket:created` | `{ ticket, queuePosition, estimatedWait }` | `branch:{branchId}` |
| `ticket:called` | `{ ticket, counterNumber }` | `branch:{branchId}` + `ticket:{ticketId}` |
| `ticket:completed` | `{ ticketId, serviceTime }` | `branch:{branchId}` |
| `ticket:no-show` | `{ ticketId }` | `branch:{branchId}` |
| `queue:updated` | `{ tickets[], stats }` | `branch:{branchId}` |

### Events Received (Client → Server)

| Event | Payload | Purpose |
|-------|---------|---------|
| `join:branch` | `{ branchId, token? }` | Join branch room (display, manager) |
| `join:ticket` | `{ ticketId }` | Track specific ticket (customer) |

---

## Notifications

### Notification Flow

```
Ticket Created
      │
      ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Confirmation│───►│ Almost Turn │───►│  Your Turn  │
│   Message   │    │   (N-2)     │    │  Counter X  │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Message Templates

#### Ticket Confirmation
```
FR: "🎫 BléSaf — Banque XYZ, Agence Lac 2
     Votre ticket: A-042
     Position: 5 | Attente: ~25 min
     Suivez votre position: [link]"

AR: "🎫 بلي ساف — بنك XYZ، فرع البحيرة 2
     تذكرتك: A-042
     الموقف: 5 | الانتظار: ~25 دقيقة
     تابع موقفك: [link]"
```

#### Almost Your Turn
```
FR: "⏰ BléSaf — Plus que 2 clients avant vous!
     Merci de vous rapprocher du guichet."

AR: "⏰ بلي ساف — باقي عميلين قبلك!
     يرجى الاقتراب من الشباك."
```

#### Your Turn
```
FR: "🔔 BléSaf — C'EST VOTRE TOUR!
     Présentez-vous au Guichet 3"

AR: "🔔 بلي ساف — جاء دورك!
     تفضل للشباك 3"
```

### Channel Logic

1. Customer provides phone + preference (SMS/WhatsApp/None) at check-in
2. If WhatsApp selected → attempt WhatsApp → if fails → fallback to SMS
3. If SMS selected → send SMS directly
4. Notifications are async (don't block API response)

---

## Analytics & Reporting

### Real-Time Metrics (Branch Manager)

- Current queue length by service
- Average wait time (rolling)
- Counters status (open/closed/serving)
- Per-agent current activity

### Daily Aggregates

| Metric | Description |
|--------|-------------|
| Total tickets | Count of all tickets created |
| Completed | Successfully served |
| No-shows | Called but didn't appear |
| Avg wait time | Mean time from creation to called |
| Avg service time | Mean time from called to completed |
| Peak hour | Hour with most check-ins |

### Agent Performance Metrics

| Metric | Description |
|--------|-------------|
| Tickets served | Count per agent |
| Avg service time | Mean per agent |
| Utilization % | Serving time / total open time |

### HQ Analytics

- Branch ranking by wait time, volume, efficiency
- Cross-branch comparison charts
- Trend analysis over time
- Service category breakdown

---

## Internationalization

### Supported Languages

| Language | Code | Direction | Primary Use |
|----------|------|-----------|-------------|
| French | `fr` | LTR | Default, formal |
| Arabic | `ar` | RTL | Customer preference |

### Implementation

- **react-i18next** for frontend translations
- **Tailwind RTL plugin** for layout mirroring
- **Per-tenant language config** for defaults
- **User language preference** stored in localStorage

### RTL Considerations

- All layouts use `rtl:` and `ltr:` Tailwind variants
- Icons and arrows flip appropriately
- Number formatting respects locale
- SMS/WhatsApp messages sent in user's preferred language

---

## Deployment & Infrastructure

### Recommended Setup

```
┌───────────────────────────────────────────────────────────┐
│                        Vercel                             │
│                   (Frontend hosting)                      │
│                   blesaf.app / *.blesaf.app              │
└───────────────────────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│                  Railway / Render                         │
│                   (Backend hosting)                       │
│                   api.blesaf.app                          │
│                                                           │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   │
│   │   Node.js   │   │  PostgreSQL │   │    Redis    │   │
│   │   Server    │   │   Database  │   │    Cache    │   │
│   └─────────────┘   └─────────────┘   └─────────────┘   │
└───────────────────────────────────────────────────────────┘
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/blesaf

# Redis
REDIS_URL=redis://host:6379

# Auth
JWT_SECRET=<random-256-bit>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# SMS (Twilio)
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+216xxxxxxxx

# WhatsApp (Meta)
WHATSAPP_BUSINESS_ID=xxx
WHATSAPP_ACCESS_TOKEN=xxx

# App
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://blesaf.app
```

---

## Security & Multi-Tenancy

### Authentication

- **JWT-based** with short-lived access tokens (15 min) and refresh tokens (7 days)
- **bcrypt** password hashing (12 rounds)
- **Rate limiting** on login attempts

### Multi-Tenancy Strategy

- **Row-level isolation** via `tenant_id` column on all tenant-scoped tables
- **Prisma middleware** automatically filters queries by tenant
- **Tenant resolution** from subdomain (web) or `x-tenant-id` header (API)

### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| super_admin | All tenants, platform config |
| bank_admin | Own tenant: all branches, users, config |
| branch_manager | Own branch: counters, queue, stats |
| teller | Own counter: queue actions only |

### Data Isolation

- Tellers can only see/act on tickets at their branch
- Branch managers see only their branch data
- Bank admins see only their bank's branches
- No cross-tenant data access possible

---

## Differentiators

### vs. Wavetec / Q-nomy / Qmatic

| Aspect | Traditional Vendors | BléSaf |
|--------|---------------------|--------|
| **Deployment** | On-premise hardware | 100% cloud, browser-based |
| **Hardware required** | Proprietary kiosks, servers | Any tablet + TV |
| **Setup time** | Weeks/months | Hours |
| **Pricing** | Opaque, per-quote | Transparent, per-branch |
| **Language** | English-first | Arabic + French native |
| **Local support** | International | Tunisia-based |

### Key Advantages

1. **Zero hardware investment** — Use existing tablets and TVs
2. **Instant deployment** — New branch online in hours, not weeks
3. **Native bilingual** — Arabic RTL + French from day one
4. **Mobile-first customer experience** — QR check-in, phone tracking
5. **Transparent pricing** — Fixed monthly fee per branch
6. **Local support** — Tunisian team, local timezone

---

## Business Model

### Pricing (Proposed)

| Tier | Branches | Price/Branch/Month | Features |
|------|----------|-------------------|----------|
| Starter | 1-10 | 150 TND (~$48) | Core features |
| Growth | 11-50 | 120 TND (~$38) | + Priority support |
| Enterprise | 51+ | 90 TND (~$29) | + Custom branding, API access |

### Additional Revenue

- **SMS/WhatsApp** — Pass-through + margin on notification volume
- **Custom integrations** — One-time fee for core banking integration
- **Training** — On-site training sessions

### Target Economics

- **Break-even:** ~30 branches
- **Target Year 1:** 2-3 banks, 150+ branches
- **Gross margin:** 70%+ (cloud infrastructure scales efficiently)

---

## Implementation Phases

### Phase 1: Project Scaffolding
- Monorepo setup (pnpm workspaces)
- Backend scaffold (Express + TypeScript)
- Frontend scaffold (React + Vite + Tailwind)
- Prisma schema + initial migration
- Shared types package

### Phase 2: Auth & Multi-Tenancy
- JWT authentication system
- Multi-tenant middleware
- RBAC middleware
- Admin CRUD APIs

### Phase 3: Core Queue Engine
- Ticket APIs (checkin, call-next, complete, no-show, transfer)
- Queue logic service
- Redis caching layer
- WebSocket integration

### Phase 4: Frontend Apps
- Kiosk check-in app
- Mobile check-in app
- Ticket status page
- TV display screen
- Teller dashboard
- Branch manager dashboard
- HQ admin portal

### Phase 5: Notifications
- SMS provider (Twilio)
- WhatsApp provider (Meta Cloud API)
- Notification service with fallback logic

### Phase 6: Analytics
- Stats aggregation service
- Analytics APIs
- Dashboard charts and reports

---

## File Inventory

| File | Description |
|------|-------------|
| `README.md` | This document — exhaustive project description |
| `IMPLEMENTATION-PLAN.md` | Technical implementation plan with code structure |
| `blesaf-flows-presentation.html` | Visual presentation of 6 core workflows |
| `blesaf-presentation-v2.html` | Simplified product presentation |

---

## Next Steps

1. **Validate presentations** with business partner
2. **Finalize pricing** and go-to-market strategy
3. **Begin Phase 1** implementation
4. **Identify pilot bank** for beta testing

---

*Document generated: January 2026*
*Project: BléSaf Banking Queue Management System*
