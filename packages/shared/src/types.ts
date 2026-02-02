import type {
  TicketStatus,
  TicketPriority,
  CounterStatus,
  UserRole,
  EntityStatus,
  NotificationChannel,
  NotificationType,
  NotificationStatus,
  TicketAction,
  CheckinMethod,
  Language,
} from './constants';

// Base entity interface with common fields
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Tenant (Bank)
export interface Tenant extends BaseEntity {
  name: string;
  subdomain: string;
  logoUrl: string | null;
  primaryColor: string | null;
  languageConfig: LanguageConfig;
  status: EntityStatus;
  branches?: Branch[];
  users?: User[];
}

export interface LanguageConfig {
  default: Language;
  available: Language[];
}

// Branch
export interface Branch extends BaseEntity {
  tenantId: string;
  tenant?: Tenant;
  name: string;
  code: string;
  address: string | null;
  region: string | null;
  timezone: string;
  status: EntityStatus;
  notifyAtPosition: number;
  counters?: Counter[];
  services?: ServiceCategory[];
  tickets?: Ticket[];
}

// Counter (Guichet)
export interface Counter extends BaseEntity {
  branchId: string;
  branch?: Branch;
  number: number;
  label: string | null;
  status: CounterStatus;
  currentTicketId: string | null;
  currentTicket?: Ticket | null;
  assignedServices?: CounterService[];
  assignedUserId: string | null;
  assignedUser?: User | null;
}

// Service Category
export interface ServiceCategory extends BaseEntity {
  branchId: string;
  branch?: Branch;
  nameAr: string;
  nameFr: string;
  prefix: string;
  icon: string | null;
  priorityWeight: number;
  avgServiceTime: number;
  isActive: boolean;
  counters?: CounterService[];
  tickets?: Ticket[];
}

// Counter-Service join table
export interface CounterService {
  counterId: string;
  counter?: Counter;
  serviceId: string;
  service?: ServiceCategory;
}

// Ticket
export interface Ticket extends BaseEntity {
  branchId: string;
  branch?: Branch;
  serviceCategoryId: string;
  serviceCategory?: ServiceCategory;
  ticketNumber: string;
  status: TicketStatus;
  priority: TicketPriority;
  customerPhone: string | null;
  notificationChannel: NotificationChannel | null;
  checkinMethod: CheckinMethod;
  counterId: string | null;
  counter?: Counter | null;
  servedByUserId: string | null;
  servedBy?: User | null;
  calledAt: Date | null;
  servingStartedAt: Date | null;
  completedAt: Date | null;
  notes: string | null;
  history?: TicketHistory[];
  notifications?: NotificationLog[];
}

// User
export interface User extends BaseEntity {
  tenantId: string;
  tenant?: Tenant;
  branchId: string | null;
  branch?: Branch | null;
  name: string;
  email: string;
  role: UserRole;
  status: EntityStatus;
  tickets?: Ticket[];
  refreshTokens?: RefreshToken[];
}

// Refresh Token (for stateful auth)
export interface RefreshToken {
  id: string;
  userId: string;
  user?: User;
  token: string;
  deviceInfo: string | null;
  expiresAt: Date;
  createdAt: Date;
}

// Ticket History (audit log)
export interface TicketHistory {
  id: string;
  ticketId: string;
  ticket?: Ticket;
  action: TicketAction;
  actorId: string | null;
  actor?: User | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

// Notification Log
export interface NotificationLog {
  id: string;
  ticketId: string;
  ticket?: Ticket;
  channel: NotificationChannel;
  messageType: NotificationType;
  recipient: string;
  providerId: string | null;
  status: NotificationStatus;
  cost: number | null;
  errorMsg: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Daily Branch Stats
export interface DailyBranchStats {
  id: string;
  branchId: string;
  branch?: Branch;
  date: Date;
  totalTickets: number;
  completedTickets: number;
  noShows: number;
  avgWaitTimeMins: number | null;
  avgServiceTimeMins: number | null;
  peakHour: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// Hourly Snapshot
export interface HourlySnapshot {
  id: string;
  branchId: string;
  branch?: Branch;
  timestamp: Date;
  hour: number;
  queueLength: number;
  activeCounters: number;
  avgWaitTimeMins: number | null;
  createdAt: Date;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  tenantId: string;
  branchId: string | null;
  role: UserRole;
  iat: number;
  exp: number;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// Service for public display (kiosk/mobile)
export interface ServiceDisplay {
  id: string;
  nameAr: string;
  nameFr: string;
  prefix: string;
  icon: string | null;
  avgServiceTime: number;
}

// Per-service queue statistics for TV display
export interface ServiceQueueStats {
  serviceId: string;
  serviceName: string;
  serviceNameAr: string;
  prefix: string;
  icon: string | null;
  waitingCount: number;
  estimatedWaitMins: number;
  nextCallEstimateMins: number; // time until first person in line is called
  nextTickets: string[]; // ticket numbers (max 3)
}

// Queue status for display
export interface QueueStatus {
  branchId: string;
  branchName: string;
  counters: CounterDisplay[];
  waitingTickets: TicketDisplay[];
  services: ServiceDisplay[];
  serviceStats: ServiceQueueStats[];
  stats: QueueStats;
}

export interface CounterDisplay {
  id: string;
  number: number;
  label: string | null;
  status: CounterStatus;
  currentTicket: TicketDisplay | null;
  assignedUserId: string | null;
  assignedUserName: string | null;
}

export interface TicketDisplay {
  id: string;
  ticketNumber: string;
  serviceName: string;
  servicePrefix: string;
  status: TicketStatus;
  position: number;
  estimatedWaitMins: number;
  createdAt: Date;
  calledAt: Date | null;
  counterNumber: number | null;
}

export interface QueueStats {
  totalWaiting: number;
  avgWaitMins: number;
  activeCounters: number;
  totalServed: number;
}

// Ticket position response
export interface TicketPosition {
  ticketId: string;
  ticketNumber: string;
  serviceName: string;
  status: TicketStatus;
  position: number;
  estimatedWaitMins: number;
  counterNumber: number | null;
  branchName: string;
}

// Teller Queue View types
export interface TellerNextTicket {
  id: string;
  ticketNumber: string;
  serviceName: string;
  serviceNameAr: string;
  priority: string;
  position: number;
  createdAt: Date;
}

export interface ServiceQueueGroup {
  serviceId: string;
  serviceName: string;
  serviceNameAr: string;
  prefix: string;
  tickets: TellerNextTicket[];
}

export interface TellerQueueView {
  counter: {
    id: string;
    number: number;
    label: string | null;
    status: string;
    services: { id: string; nameAr: string; nameFr: string; prefix: string }[];
  } | null;
  currentTicket: {
    id: string;
    ticketNumber: string;
    serviceName: string;
    status: string;
    calledAt: Date | null;
    servingStartedAt: Date | null;
  } | null;
  nextTickets: TellerNextTicket[];
  nextTicketsByService: ServiceQueueGroup[];
  // Global FIFO queue (all waiting tickets in branch, not filtered by service)
  globalQueue: TellerNextTicket[];
  totalWaitingInBranch: number;
}

// Socket.IO event payloads
export interface TicketCreatedEvent {
  ticket: TicketDisplay;
  queuePosition: number;
  estimatedWait: number;
}

export interface TicketCalledEvent {
  ticket: TicketDisplay;
  counterNumber: number;
  counterLabel: string | null;
}

export interface TicketCompletedEvent {
  ticketId: string;
  serviceTimeMins: number;
}

export interface QueueUpdatedEvent {
  tickets: TicketDisplay[];
  stats: QueueStats;
  counters: CounterDisplay[];
}
