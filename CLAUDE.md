# CLAUDE.md - BléSaf Banking Queue Management

## Project Summary

**BléSaf** (Blé = sans, Saf = file - "No More Waiting in Line") is a cloud-based, multi-tenant SaaS platform for managing customer queues in bank branches across Tunisia and North Africa.

- **Problem:** Customers wait 30-60+ minutes with no visibility; managers have no operational data
- **Solution:** Real-time queue tracking, SMS/WhatsApp notifications, teller dashboards, analytics
- **Current Version:** 0.22

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| State | Zustand |
| Real-time | Socket.io-client |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (15min access / 7d refresh) |
| i18n | react-i18next (French + Arabic RTL) |

---

## Project Structure

```
apps/
  web/src/
    pages/       - Route components (kiosk, teller, manager, admin)
    components/  - UI components
    stores/      - Zustand state (authStore, queueStore)
    lib/         - API client, utilities
  api/src/
    routes/      - Express route handlers
    services/    - Business logic (queueService, breakService)
    middleware/  - Auth, RBAC, tenant isolation
    socket/      - Socket.io event handlers
packages/
  shared/        - Shared types (types.ts), constants
```

---

## Code Style

- **TypeScript strict mode** - No `any` types
- **Zod validation** - All API inputs validated with Zod schemas
- **Tailwind only** - No separate CSS files, use Tailwind classes
- **Material Symbols** - Use `<span className="material-symbols-outlined">icon</span>` for icons
- **Zustand** - Lightweight stores, avoid Redux patterns
- **Middleware factories** - RBAC functions like `requireBranchAccess()` need parentheses

---

## Design System

**IMPORTANT:** When styling screens, follow [docs/design-system.md](docs/design-system.md).

Key points:
- **Brand colors:** SG Red `#E9041E`, Black `#1A1A1A`, Rose `#D66874`
- **Cards:** `bg-white rounded-lg border border-gray-200 p-5`
- **Buttons:** `px-6 py-3 rounded-lg font-semibold` with SG Red background
- **Icons:** Material Symbols at 24px default
- **Spacing:** 4px base (p-4 = 16px, gap-4 = 16px)

---

## Key Files

| File | Purpose |
|------|---------|
| `apps/web/src/lib/api.ts` | Axios client with auth interceptors |
| `apps/web/src/stores/queueStore.ts` | Real-time queue state + socket subscriptions |
| `apps/api/src/services/queueService.ts` | Core queue logic (call, complete, no-show) |
| `apps/api/src/middleware/rbac.ts` | Role-based access control |
| `packages/shared/src/types.ts` | Shared TypeScript interfaces |

---

## Commands

```bash
pnpm dev          # Start both frontend (5173) and backend (3001)
pnpm dev:web      # Frontend only
pnpm dev:api      # Backend only
pnpm db:push      # Push Prisma schema to database
pnpm db:studio    # Open Prisma Studio GUI
pnpm db:seed      # Seed test data
```

---

## Known Bugs

*(none currently tracked)*

---

## Next TODOs

**BM Dashboard Enhancement (Phase B):**
1. [ ] Quick Actions Panel - Pause queue, open all counters, send announcements
2. [ ] Individual long-wait alerts - Warn when customer waiting >20 min
3. [ ] Priority override - Bump VIP/urgent customers to front
4. [ ] Daily targets & SLA tracking - Set goals, measure % served within X min

**Future (Phase C-D):**
- [ ] SMS activation (Twilio integration)
- [ ] Announcement system (TV/Kiosk display)
- [ ] Historical trends (week/month analytics)
- [ ] Teller activity timeline

---

## Reference Docs (read on demand)

- [docs/design-system.md](docs/design-system.md) - Complete styling guide with colors, components, patterns
- [docs/API-REFERENCE.md](docs/API-REFERENCE.md) - All API endpoints
- [docs/DATA-MODEL.md](docs/DATA-MODEL.md) - Database schema details
- [docs/BM-ENHANCEMENT-PLAN.md](docs/BM-ENHANCEMENT-PLAN.md) - Detailed BM dashboard roadmap
- [README.md](README.md) - Full project documentation
- [CHANGELOG.md](CHANGELOG.md) - Version history
