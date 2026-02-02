# Data Model - BléSaf Banking

## Entity Relationship Overview

```
Tenant (Bank)
    │
    ├── Branch[]
    │       │
    │       ├── Counter[]
    │       │       │
    │       │       └── CounterService[] ──┐
    │       │                              │
    │       ├── ServiceCategory[] ─────────┘
    │       │
    │       ├── Ticket[]
    │       │
    │       └── TellerBreak[]
    │
    └── User[] ─────────── (serves tickets)
```

---

## Core Models

### Tenant (Bank)

```prisma
model Tenant {
  id            String   @id @default(uuid())
  name          String   // e.g., "Banque Nationale de Tunisie"
  subdomain     String   @unique // e.g., "bnt"
  logoUrl       String?
  primaryColor  String?
  languageConfig Json    // { default: "fr", available: ["fr", "ar"] }
  status        EntityStatus @default(active)
  createdAt     DateTime @default(now())

  branches      Branch[]
  users         User[]
}
```

### Branch

```prisma
model Branch {
  id        String   @id @default(uuid())
  tenantId  String
  name      String   // e.g., "Agence Lac 2"
  code      String   // e.g., "LAC2"
  address   String?
  region    String?
  timezone  String   @default("Africa/Tunis")
  status    EntityStatus @default(active)

  counters          Counter[]
  serviceCategories ServiceCategory[]
  tickets           Ticket[]
  tellerBreaks      TellerBreak[]
}
```

### Counter (Guichet)

```prisma
model Counter {
  id              String   @id @default(uuid())
  branchId        String
  number          Int      // e.g., 1, 2, 3
  label           String?  // e.g., "Guichet Rapide"
  status          CounterStatus @default(closed)
  currentTicketId String?  @unique
  assignedUserId  String?

  services        CounterService[]
  activeBreak     TellerBreak?
}

enum CounterStatus {
  open
  closed
  on_break
}
```

### ServiceCategory

```prisma
model ServiceCategory {
  id             String   @id @default(uuid())
  branchId       String
  nameAr         String   // Arabic name
  nameFr         String   // French name
  prefix         String   // e.g., "A", "B", "C" for ticket numbering
  icon           String?  // emoji or Material Symbol name
  priorityWeight Int      @default(0) // for VIP services
  avgServiceTime Int      @default(10) // minutes, for wait estimation
  isActive       Boolean  @default(true)

  tickets        Ticket[]
  counters       CounterService[]
}
```

### CounterService (Join Table)

```prisma
model CounterService {
  counterId  String
  serviceId  String

  counter    Counter         @relation(...)
  service    ServiceCategory @relation(...)

  @@id([counterId, serviceId])
}
```

### Ticket

```prisma
model Ticket {
  id                  String   @id @default(uuid())
  branchId            String
  serviceCategoryId   String
  ticketNumber        String   // e.g., "A-042"

  status              TicketStatus @default(waiting)
  priority            TicketPriority @default(normal)

  customerPhone       String?
  notificationChannel NotificationChannel @default(none)
  checkinMethod       CheckinMethod @default(kiosk)

  counterId           String?  // assigned counter
  servedByUserId      String?  // teller who served

  createdAt           DateTime @default(now())
  calledAt            DateTime?
  servingStartedAt    DateTime?
  completedAt         DateTime?
  notes               String?
}

enum TicketStatus {
  waiting
  called
  serving
  completed
  no_show
  cancelled
}

enum TicketPriority {
  normal
  vip
}

enum CheckinMethod {
  kiosk
  mobile
  manual
}

enum NotificationChannel {
  none
  sms
  whatsapp
}
```

### User

```prisma
model User {
  id           String   @id @default(uuid())
  tenantId     String
  branchId     String?  // null for bank_admin/super_admin
  name         String
  email        String   @unique
  passwordHash String
  role         UserRole
  status       EntityStatus @default(active)

  servedTickets  Ticket[]
  tellerBreaks   TellerBreak[]
}

enum UserRole {
  super_admin
  bank_admin
  branch_manager
  teller
}

enum EntityStatus {
  active
  inactive
  suspended
}
```

### TellerBreak

```prisma
model TellerBreak {
  id           String    @id @default(uuid())
  counterId    String
  userId       String
  branchId     String

  reason       String    // lunch, prayer, personal, urgent
  startedAt    DateTime  @default(now())
  expectedEnd  DateTime
  actualEnd    DateTime?
  durationMins Int

  startedById  String    // userId who initiated
  endedById    String?   // userId who ended

  createdAt    DateTime  @default(now())
}
```

---

## Enums Reference

### Status Enums

| Enum | Values | Usage |
|------|--------|-------|
| `TicketStatus` | waiting, called, serving, completed, no_show, cancelled | Ticket lifecycle |
| `CounterStatus` | open, closed, on_break | Counter availability |
| `EntityStatus` | active, inactive, suspended | Users, branches |

### Role Enum

| Role | Scope | Permissions |
|------|-------|-------------|
| `super_admin` | Platform | All tenants |
| `bank_admin` | Tenant | All branches in bank |
| `branch_manager` | Branch | Single branch ops |
| `teller` | Counter | Call/complete tickets |

---

## Indexes

Key performance indexes:

```prisma
@@index([branchId, status])        // Ticket - queue queries
@@index([branchId, createdAt])     // Ticket - daily queries
@@index([counterId])               // TellerBreak
@@index([branchId, startedAt])     // TellerBreak
```

---

## Schema Location

```
apps/api/prisma/schema.prisma
```

Commands:
```bash
pnpm db:push      # Push schema changes
pnpm db:migrate   # Create migration
pnpm db:studio    # Open Prisma Studio
```
