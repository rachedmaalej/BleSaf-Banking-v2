import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';
import { SOCKET_EVENTS } from '@blesaf/shared';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = useAuthStore.getState().accessToken;

    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    socket.on(SOCKET_EVENTS.ERROR, (message) => {
      console.error('Socket error:', message);
    });
  }

  return socket;
}

export function connectSocket(): void {
  const socket = getSocket();
  if (!socket.connected) {
    socket.connect();
  }
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function updateSocketAuth(token: string | null): void {
  if (socket) {
    socket.auth = { token };
    if (socket.connected) {
      socket.disconnect();
      socket.connect();
    }
  }
}

// Helper to emit after connection
function emitWhenConnected(event: string, data: unknown): void {
  const sock = getSocket();
  if (sock.connected) {
    sock.emit(event, data);
  } else {
    sock.once('connect', () => {
      sock.emit(event, data);
    });
  }
}

// Helper functions for joining/leaving rooms
export function joinBranchRoom(branchId: string): void {
  emitWhenConnected(SOCKET_EVENTS.JOIN_BRANCH, { branchId });
  console.log('Joining branch room:', branchId);
}

export function leaveBranchRoom(branchId: string): void {
  const socket = getSocket();
  socket.emit(SOCKET_EVENTS.LEAVE_BRANCH, { branchId });
}

export function joinTicketRoom(ticketId: string): void {
  emitWhenConnected(SOCKET_EVENTS.JOIN_TICKET, { ticketId });
  console.log('Joining ticket room:', ticketId);
}

export function leaveTicketRoom(ticketId: string): void {
  const socket = getSocket();
  socket.emit(SOCKET_EVENTS.LEAVE_TICKET, { ticketId });
}

export function joinDisplayRoom(branchId: string): void {
  emitWhenConnected('join:display', { branchId });
  console.log('Joining display room:', branchId);
}

export { SOCKET_EVENTS };
