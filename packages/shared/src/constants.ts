// Ticket statuses
export const TICKET_STATUS = {
  WAITING: 'waiting',
  CALLED: 'called',
  SERVING: 'serving',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
  CANCELLED: 'cancelled',
} as const;

export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

// Ticket priorities
export const TICKET_PRIORITY = {
  NORMAL: 'normal',
  VIP: 'vip',
} as const;

export type TicketPriority = (typeof TICKET_PRIORITY)[keyof typeof TICKET_PRIORITY];

// Counter statuses
export const COUNTER_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
  PAUSED: 'paused',
  ON_BREAK: 'on_break',
} as const;

export type CounterStatus = (typeof COUNTER_STATUS)[keyof typeof COUNTER_STATUS];

// Branch queue statuses
export const QUEUE_STATUS = {
  OPEN: 'open',
  PAUSED: 'paused',
  CLOSED: 'closed', // End-of-day closure (distinct from manual pause)
} as const;

export type QueueStatus = (typeof QUEUE_STATUS)[keyof typeof QUEUE_STATUS];

// User roles
export const USER_ROLE = {
  SUPER_ADMIN: 'super_admin',
  BANK_ADMIN: 'bank_admin',
  BRANCH_MANAGER: 'branch_manager',
  TELLER: 'teller',
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

// Entity statuses
export const ENTITY_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
} as const;

export type EntityStatus = (typeof ENTITY_STATUS)[keyof typeof ENTITY_STATUS];

// Notification channels
export const NOTIFICATION_CHANNEL = {
  NONE: 'none',
  SMS: 'sms',
  WHATSAPP: 'whatsapp',
} as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNEL)[keyof typeof NOTIFICATION_CHANNEL];

// Notification message types
export const NOTIFICATION_TYPE = {
  CONFIRMATION: 'confirmation',
  ALMOST_TURN: 'almost_turn',
  YOUR_TURN: 'your_turn',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

// Notification statuses
export const NOTIFICATION_STATUS = {
  QUEUED: 'queued',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
} as const;

export type NotificationStatus = (typeof NOTIFICATION_STATUS)[keyof typeof NOTIFICATION_STATUS];

// Ticket history actions
export const TICKET_ACTION = {
  CREATED: 'created',
  CALLED: 'called',
  SERVING: 'serving',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
  CANCELLED: 'cancelled',
  TRANSFERRED: 'transferred',
  PRIORITY_BUMPED: 'priority_bumped',
  AUTO_COMPLETED: 'auto_completed', // System auto-completed at closing time
  AUTO_CANCELLED: 'auto_cancelled', // System auto-cancelled at closing time
} as const;

export type TicketAction = (typeof TICKET_ACTION)[keyof typeof TICKET_ACTION];

// System actor ID for automated actions
export const SYSTEM_ACTOR_ID = 'SYSTEM';

// Check-in methods
export const CHECKIN_METHOD = {
  KIOSK: 'kiosk',
  MOBILE: 'mobile',
  MANUAL: 'manual',
} as const;

export type CheckinMethod = (typeof CHECKIN_METHOD)[keyof typeof CHECKIN_METHOD];

// Languages
export const LANGUAGE = {
  FRENCH: 'fr',
  ARABIC: 'ar',
} as const;

export type Language = (typeof LANGUAGE)[keyof typeof LANGUAGE];

// Socket.IO events
export const SOCKET_EVENTS = {
  // Client -> Server
  JOIN_BRANCH: 'join:branch',
  JOIN_TICKET: 'join:ticket',
  LEAVE_BRANCH: 'leave:branch',
  LEAVE_TICKET: 'leave:ticket',

  // Server -> Client
  TICKET_CREATED: 'ticket:created',
  TICKET_CALLED: 'ticket:called',
  TICKET_SERVING: 'ticket:serving',
  TICKET_COMPLETED: 'ticket:completed',
  TICKET_NO_SHOW: 'ticket:no_show',
  TICKET_TRANSFERRED: 'ticket:transferred',
  TICKET_PRIORITIZED: 'ticket:prioritized',
  QUEUE_UPDATED: 'queue:updated',
  QUEUE_PAUSED: 'queue:paused',
  QUEUE_RESUMED: 'queue:resumed',
  QUEUE_RESET: 'queue:reset',
  QUEUE_AUTO_CLOSED: 'queue:auto_closed', // Auto-closed at closing time
  QUEUE_AUTO_OPENED: 'queue:auto_opened', // Auto-opened at opening time
  COUNTER_UPDATED: 'counter:updated',
  ANNOUNCEMENT_CREATED: 'announcement:created',
  ANNOUNCEMENT_DISMISSED: 'announcement:dismissed',
  ERROR: 'error',
} as const;

// Default configuration values
export const DEFAULTS = {
  AVG_SERVICE_TIME_MINS: 10,
  NOTIFY_AT_POSITION: 2,
  JWT_ACCESS_EXPIRES: '15m',
  JWT_REFRESH_EXPIRES: '7d',
  TIMEZONE: 'Africa/Tunis',
  LANGUAGE: 'fr' as Language,
} as const;

// API rate limits
export const RATE_LIMITS = {
  LOGIN_ATTEMPTS_PER_MINUTE: 5,
  CHECKIN_ATTEMPTS_PER_MINUTE: 10,
  API_REQUESTS_PER_MINUTE: 100,
} as const;

// Tunisia regions (all 24 governorates)
export const TUNISIA_REGIONS = [
  { value: 'Tunis', label: 'Tunis' },
  { value: 'Ariana', label: 'Ariana' },
  { value: 'Ben Arous', label: 'Ben Arous' },
  { value: 'Manouba', label: 'Manouba' },
  { value: 'Nabeul', label: 'Nabeul' },
  { value: 'Zaghouan', label: 'Zaghouan' },
  { value: 'Bizerte', label: 'Bizerte' },
  { value: 'Béja', label: 'Béja' },
  { value: 'Jendouba', label: 'Jendouba' },
  { value: 'Kef', label: 'Kef' },
  { value: 'Siliana', label: 'Siliana' },
  { value: 'Sousse', label: 'Sousse' },
  { value: 'Monastir', label: 'Monastir' },
  { value: 'Mahdia', label: 'Mahdia' },
  { value: 'Sfax', label: 'Sfax' },
  { value: 'Kairouan', label: 'Kairouan' },
  { value: 'Kasserine', label: 'Kasserine' },
  { value: 'Sidi Bouzid', label: 'Sidi Bouzid' },
  { value: 'Gabès', label: 'Gabès' },
  { value: 'Médenine', label: 'Médenine' },
  { value: 'Tataouine', label: 'Tataouine' },
  { value: 'Gafsa', label: 'Gafsa' },
  { value: 'Tozeur', label: 'Tozeur' },
  { value: 'Kébili', label: 'Kébili' },
] as const;
