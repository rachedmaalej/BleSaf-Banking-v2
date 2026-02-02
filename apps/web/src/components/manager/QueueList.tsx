import { useState } from 'react';
import { queueApi } from '@/lib/api';

const LONG_WAIT_THRESHOLD_MINS = 20;

interface QueueTicket {
  id: string;
  ticketNumber: string;
  serviceName: string;
  createdAt: string;
  priority?: string;
}

interface QueueListProps {
  tickets: QueueTicket[];
  onTicketBumped?: () => void;
  maxVisible?: number;
}

export function QueueList({ tickets, onTicketBumped, maxVisible = 8 }: QueueListProps) {
  const [bumpingTicket, setBumpingTicket] = useState<string | null>(null);
  const now = new Date();

  const ticketsWithWait = tickets.map((t) => {
    const createdAt = new Date(t.createdAt);
    const waitMins = Math.floor((now.getTime() - createdAt.getTime()) / 60000);
    const isLongWait = waitMins >= LONG_WAIT_THRESHOLD_MINS;
    const isVip = t.priority === 'vip';
    return { ...t, waitMins, isLongWait, isVip };
  });

  const visibleTickets = ticketsWithWait.slice(0, maxVisible);
  const remainingCount = tickets.length - maxVisible;

  const bumpTicketPriority = async (ticketId: string) => {
    setBumpingTicket(ticketId);
    try {
      await queueApi.bumpTicketPriority(ticketId);
      onTicketBumped?.();
    } catch (error) {
      console.error('Failed to bump ticket priority:', error);
    } finally {
      setBumpingTicket(null);
    }
  };

  if (tickets.length === 0) {
    return (
      <div className="text-center py-8" style={{ color: '#666' }}>
        <span
          className="material-symbols-outlined block mb-2"
          style={{ fontSize: '32px', color: '#D1D5DB' }}
        >
          check_circle
        </span>
        Aucun client en attente
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {visibleTickets.map((ticket) => {
        const isBumping = bumpingTicket === ticket.id;

        // Determine border color based on status
        let borderColor = 'transparent';
        let bgColor = 'white';
        if (ticket.isVip) {
          borderColor = '#E9041E';
          bgColor = 'rgba(233, 4, 30, 0.03)';
        } else if (ticket.isLongWait) {
          borderColor = '#F59E0B';
          bgColor = 'rgba(245, 158, 11, 0.03)';
        }

        return (
          <div
            key={ticket.id}
            className="flex items-center gap-4 rounded-lg"
            style={{
              padding: '12px 16px',
              backgroundColor: bgColor,
              borderLeft: `3px solid ${borderColor}`,
            }}
          >
            {/* Ticket number + service */}
            <div className="flex-1">
              <span className="font-semibold" style={{ color: '#1A1A1A' }}>
                {ticket.ticketNumber}
              </span>
              <span className="ml-2 text-sm" style={{ color: '#666' }}>
                {ticket.serviceName}
                {ticket.isVip && ' VIP'}
              </span>
            </div>

            {/* Wait time */}
            <span
              className="text-sm"
              style={{
                color: ticket.isLongWait ? '#B45309' : '#666',
                fontWeight: ticket.isLongWait ? 500 : 400,
              }}
            >
              {ticket.waitMins} min
            </span>

            {/* VIP button (only for non-VIP tickets) */}
            {!ticket.isVip && (
              <button
                onClick={() => bumpTicketPriority(ticket.id)}
                disabled={isBumping}
                className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                style={{
                  backgroundColor: '#FEF3C7',
                  color: '#B45309',
                }}
                title="Passer en priorité VIP"
              >
                {isBumping ? (
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: '12px' }}>
                    progress_activity
                  </span>
                ) : (
                  'VIP'
                )}
              </button>
            )}

            {/* Bumped label for VIP tickets */}
            {ticket.isVip && (
              <span
                className="text-xs font-medium px-2 py-1 rounded"
                style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
              >
                Bumped
              </span>
            )}
          </div>
        );
      })}

      {/* Remaining count */}
      {remainingCount > 0 && (
        <div
          className="text-center text-sm pt-2"
          style={{ color: '#666' }}
        >
          +{remainingCount} autre{remainingCount > 1 ? 's' : ''} en attente
        </div>
      )}
    </div>
  );
}
