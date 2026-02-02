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
} as const;

export type CounterStatus = (typeof COUNTER_STATUS)[keyof typeof COUNTER_STATUS];

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
} as const;

export type TicketAction = (typeof TICKET_ACTION)[keyof typeof TICKET_ACTION];

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
  QUEUE_UPDATED: 'queue:updated',
  COUNTER_UPDATED: 'counter:updated',
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
