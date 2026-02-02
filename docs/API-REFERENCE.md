# API Reference - BléSaf Banking

## Base URL

```
Development: http://localhost:3001/api
Production: https://api.blesaf.tn/api
```

## Authentication

JWT-based authentication with access/refresh token pattern.

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <accessToken>` |
| `x-tenant-id` | Tenant UUID (auto-added by interceptor) |

---

## Auth Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Login with email/password | No |
| POST | `/auth/refresh` | Refresh access token | Refresh token |
| POST | `/auth/logout` | Invalidate refresh token | Yes |
| POST | `/auth/logout-all` | Logout all sessions | Yes |
| GET | `/auth/me` | Get current user | Yes |

---

## Queue Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/queue/checkin` | Create ticket (kiosk/mobile) | No |
| POST | `/queue/call-next` | Call next ticket | Teller |
| POST | `/queue/counter/:id/call-next-service/:serviceId` | Call next for specific service | Teller |
| POST | `/queue/:id/serve` | Start serving ticket | Teller |
| POST | `/queue/:id/complete` | Complete service | Teller |
| POST | `/queue/:id/no-show` | Mark as no-show | Teller |
| POST | `/queue/:id/transfer` | Transfer to another service | Teller |
| POST | `/queue/:id/cancel` | Cancel ticket | Teller |
| GET | `/queue/branch/:id/status` | Get branch queue state | No |
| GET | `/queue/branch/:id/teller` | Get teller queue view | Teller |
| GET | `/queue/ticket/:id/status` | Get ticket position | No |
| GET | `/queue/branches` | List branches (public) | No |

---

## Admin Endpoints

### Branches

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/branches` | List branches | Bank Admin |
| POST | `/admin/branches` | Create branch | Bank Admin |
| GET | `/admin/branches/:id` | Get branch | Bank Admin |
| PATCH | `/admin/branches/:id` | Update branch | Bank Admin |

### Counters

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/counters` | List counters | Branch Manager |
| POST | `/admin/counters` | Create counter | Branch Manager |
| PATCH | `/admin/counters/:id` | Update counter | Branch Manager |
| DELETE | `/admin/counters/:id` | Delete counter | Branch Manager |

### Services

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/services` | List service categories | Bank Admin |
| POST | `/admin/services` | Create service | Bank Admin |
| PATCH | `/admin/services/:id` | Update service | Bank Admin |
| DELETE | `/admin/services/:id` | Delete service | Bank Admin |

### Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/users` | List users | Bank Admin |
| POST | `/admin/users` | Create user | Bank Admin |
| GET | `/admin/users/:id` | Get user | Bank Admin |
| PATCH | `/admin/users/:id` | Update user | Bank Admin |
| DELETE | `/admin/users/:id` | Delete user | Bank Admin |

---

## Analytics Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/analytics/branch/:id/today` | Today's stats | Branch Manager |
| GET | `/analytics/branch/:id/history` | Historical stats | Branch Manager |
| GET | `/analytics/branch/:id/agents` | Agent performance | Branch Manager |
| GET | `/analytics/branch/:id/hourly` | Hourly breakdown | Branch Manager |
| GET | `/analytics/branch/:id/comparison` | Today vs yesterday | Branch Manager |
| GET | `/analytics/tenant/ranking` | Branch ranking | Branch Manager |
| GET | `/analytics/tenant/overview` | All branches summary | Bank Admin |
| GET | `/analytics/tenant/compare` | Branch comparison | Bank Admin |
| GET | `/analytics/tenant/services` | Service breakdown | Bank Admin |

---

## Breaks Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/breaks/start` | Start teller break | Branch Manager |
| POST | `/breaks/:id/end` | End break | Branch Manager |
| PATCH | `/breaks/:id/extend` | Extend break duration | Branch Manager |
| GET | `/breaks/branch/:id` | Get branch breaks | Branch Manager |
| GET | `/breaks/counter/:id` | Get counter break | Branch Manager |
| GET | `/breaks/reasons` | Get break reason options | Branch Manager |

---

## Socket.IO Events

### Client → Server

| Event | Payload | Purpose |
|-------|---------|---------|
| `join:branch` | `{ branchId, token? }` | Join branch room |
| `join:ticket` | `{ ticketId }` | Track specific ticket |
| `leave:branch` | `{ branchId }` | Leave branch room |
| `leave:ticket` | `{ ticketId }` | Stop tracking ticket |

### Server → Client

| Event | Payload | Sent To |
|-------|---------|---------|
| `ticket:created` | `{ ticket, queuePosition, estimatedWait }` | `branch:{id}` |
| `ticket:called` | `{ ticket, counterNumber }` | `branch:{id}` + `ticket:{id}` |
| `ticket:serving` | `{ ticket }` | `branch:{id}` |
| `ticket:completed` | `{ ticketId, serviceTime }` | `branch:{id}` |
| `ticket:no_show` | `{ ticketId }` | `branch:{id}` |
| `ticket:transferred` | `{ ticket, targetService }` | `branch:{id}` |
| `queue:updated` | `{ tickets[], stats }` | `branch:{id}` |
| `counter:updated` | `{ counter }` | `branch:{id}` |

---

## Response Format

All responses follow this structure:

```json
{
  "success": true,
  "data": { ... }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input"
  }
}
```

---

## Query Parameters

### Pagination

```
?page=1&pageSize=20
```

### Filtering

```
?branchId=xxx&role=teller
?startDate=2026-01-01&endDate=2026-01-31
?groupBy=day|hour
```
