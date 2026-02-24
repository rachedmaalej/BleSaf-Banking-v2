import { create } from 'zustand';
import { queueApi } from '@/lib/api';
import {
  BranchQueueState,
  TicketPosition,
  TellerQueueView,
} from '@blesaf/shared';

interface QueueState {
  // Branch queue status (for display/manager)
  branchStatus: BranchQueueState | null;
  isLoadingBranchStatus: boolean;

  // Ticket position (for customer)
  ticketPosition: TicketPosition | null;
  isLoadingTicketPosition: boolean;

  // Teller view
  tellerQueue: TellerQueueView | null;
  isLoadingTellerQueue: boolean;
  isCallingNext: boolean;

  // Actions
  fetchBranchStatus: (branchId: string) => Promise<void>;
  fetchTicketPosition: (ticketId: string) => Promise<void>;
  fetchTellerQueue: (branchId: string) => Promise<void>;

  // Teller actions with optimistic updates
  callNext: (counterId: string) => Promise<any>;
  callNextByService: (counterId: string, serviceId: string) => Promise<any>;
  startServing: (ticketId: string) => Promise<void>;
  completeTicket: (ticketId: string, notes?: string) => Promise<void>;
  markNoShow: (ticketId: string) => Promise<void>;
  transferTicket: (ticketId: string, targetServiceId: string, notes?: string) => Promise<void>;

  // Socket event handlers
  handleTicketCreated: (data: any) => void;
  handleTicketCalled: (data: any) => void;
  handleTicketCompleted: (data: any) => void;
  handleQueueUpdated: (data: any) => void;

  // Reset
  reset: () => void;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  branchStatus: null,
  isLoadingBranchStatus: false,
  ticketPosition: null,
  isLoadingTicketPosition: false,
  tellerQueue: null,
  isLoadingTellerQueue: false,
  isCallingNext: false,

  fetchBranchStatus: async (branchId: string) => {
    set({ isLoadingBranchStatus: true });
    try {
      const response = await queueApi.getBranchStatus(branchId);
      set({ branchStatus: response.data.data, isLoadingBranchStatus: false });
    } catch (error) {
      set({ isLoadingBranchStatus: false });
      throw error;
    }
  },

  fetchTicketPosition: async (ticketId: string) => {
    set({ isLoadingTicketPosition: true });
    try {
      const response = await queueApi.getTicketStatus(ticketId);
      set({ ticketPosition: response.data.data, isLoadingTicketPosition: false });
    } catch (error) {
      set({ isLoadingTicketPosition: false });
      throw error;
    }
  },

  fetchTellerQueue: async (branchId: string) => {
    console.log('[queueStore] fetchTellerQueue called with branchId:', branchId);
    set({ isLoadingTellerQueue: true });
    try {
      const response = await queueApi.getTellerQueue(branchId);
      const data = response.data.data;

      // DEBUG: Log the full response
      console.log('[queueStore] Teller queue response:', {
        hasCounter: !!data?.counter,
        counter: data?.counter,
        currentTicket: data?.currentTicket,
        nextTicketsCount: data?.nextTickets?.length || 0,
        nextTicketsByServiceCount: data?.nextTicketsByService?.length || 0,
        servicesAssigned: data?.counter?.services?.length || 0,
        globalQueueCount: data?.globalQueue?.length || 0,
        totalWaitingInBranch: data?.totalWaitingInBranch || 0,
      });

      if (!data?.counter) {
        console.warn('[queueStore] No counter in response! The teller is not assigned to any counter.');
        console.warn('[queueStore] To fix: In the database, set Counter.assignedUserId to the teller\'s user ID');
      } else if (!data?.counter?.services?.length) {
        console.warn('[queueStore] Counter has no services assigned! Tickets won\'t be visible.');
        console.warn('[queueStore] To fix: Add entries to CounterService table linking counter to services');
      }

      set({ tellerQueue: data, isLoadingTellerQueue: false });
    } catch (error: any) {
      console.error('[queueStore] fetchTellerQueue error:', error.response?.data || error.message);
      set({ isLoadingTellerQueue: false });
      throw error;
    }
  },

  callNext: async (counterId: string) => {
    const { tellerQueue } = get();
    if (!tellerQueue) return;

    // Optimistic update - use global FIFO queue (first ticket in branch, regardless of service)
    const optimisticTicket = tellerQueue.globalQueue?.[0];

    set({ isCallingNext: true });

    if (optimisticTicket) {
      // Optimistically update UI - remove called ticket from all queues
      set({
        tellerQueue: {
          ...tellerQueue,
          currentTicket: {
            id: optimisticTicket.id,
            ticketNumber: optimisticTicket.ticketNumber,
            serviceName: optimisticTicket.serviceName,
            status: 'serving', // Now goes directly to serving
            calledAt: new Date(),
            servingStartedAt: new Date(),
          },
          // Update both nextTickets and globalQueue
          nextTickets: tellerQueue.nextTickets.filter(t => t.id !== optimisticTicket.id),
          globalQueue: tellerQueue.globalQueue?.slice(1) || [],
          totalWaitingInBranch: Math.max(0, (tellerQueue.totalWaitingInBranch || 0) - 1),
        },
      });
    }

    try {
      const response = await queueApi.callNext(counterId);
      set({ isCallingNext: false });

      // Reconcile with server response if different
      const serverTicket = response.data.data?.ticket;
      if (serverTicket && optimisticTicket && serverTicket.id !== optimisticTicket.id) {
        // Server returned a different ticket (race condition resolved)
        const currentTellerQueue = get().tellerQueue;
        if (currentTellerQueue) {
          set({
            tellerQueue: {
              ...currentTellerQueue,
              currentTicket: {
                id: serverTicket.id,
                ticketNumber: serverTicket.ticketNumber,
                serviceName: serverTicket.serviceName,
                status: 'called',
                calledAt: serverTicket.calledAt,
                servingStartedAt: null,
              },
            },
          });
        }
      }

      return response.data.data;
    } catch (error) {
      // Rollback on error
      set({
        tellerQueue: tellerQueue,
        isCallingNext: false,
      });
      throw error;
    }
  },

  callNextByService: async (counterId: string, serviceId: string) => {
    const { tellerQueue } = get();
    if (!tellerQueue) return;

    // Find the first ticket for this service
    const serviceGroup = tellerQueue.nextTicketsByService?.find((g) => g.serviceId === serviceId);
    const optimisticTicket = serviceGroup?.tickets[0];

    set({ isCallingNext: true });

    if (optimisticTicket) {
      // Optimistically update UI - remove called ticket from all queues
      set({
        tellerQueue: {
          ...tellerQueue,
          currentTicket: {
            id: optimisticTicket.id,
            ticketNumber: optimisticTicket.ticketNumber,
            serviceName: optimisticTicket.serviceName,
            status: 'serving', // Now goes directly to serving
            calledAt: new Date(),
            servingStartedAt: new Date(),
          },
          // Update nextTicketsByService to remove the called ticket
          nextTicketsByService: tellerQueue.nextTicketsByService?.map((g) =>
            g.serviceId === serviceId
              ? { ...g, tickets: g.tickets.slice(1) }
              : g
          ) || [],
          // Also update globalQueue to remove the called ticket
          globalQueue: tellerQueue.globalQueue?.filter(t => t.id !== optimisticTicket.id) || [],
          totalWaitingInBranch: Math.max(0, (tellerQueue.totalWaitingInBranch || 0) - 1),
        },
      });
    }

    try {
      const response = await queueApi.callNextByService(counterId, serviceId);
      set({ isCallingNext: false });

      if (!response.data.success) {
        // No tickets for this service - rollback
        set({ tellerQueue });
        return null;
      }

      // Reconcile with server response if different
      const serverTicket = response.data.data?.ticket;
      if (serverTicket && optimisticTicket && serverTicket.id !== optimisticTicket.id) {
        const currentTellerQueue = get().tellerQueue;
        if (currentTellerQueue) {
          set({
            tellerQueue: {
              ...currentTellerQueue,
              currentTicket: {
                id: serverTicket.id,
                ticketNumber: serverTicket.ticketNumber,
                serviceName: serverTicket.serviceName,
                status: 'called',
                calledAt: serverTicket.calledAt,
                servingStartedAt: null,
              },
            },
          });
        }
      }

      return response.data.data;
    } catch (error) {
      // Rollback on error
      set({
        tellerQueue: tellerQueue,
        isCallingNext: false,
      });
      throw error;
    }
  },

  startServing: async (ticketId: string) => {
    const { tellerQueue } = get();
    if (!tellerQueue?.currentTicket) return;

    // Optimistic update
    set({
      tellerQueue: {
        ...tellerQueue,
        currentTicket: {
          ...tellerQueue.currentTicket,
          status: 'serving',
          servingStartedAt: new Date(),
        },
      },
    });

    try {
      await queueApi.startServing(ticketId);
    } catch (error) {
      // Rollback
      set({ tellerQueue });
      throw error;
    }
  },

  completeTicket: async (ticketId: string, notes?: string) => {
    const { tellerQueue } = get();
    if (!tellerQueue) return;

    // Optimistic update - clear current ticket
    set({
      tellerQueue: {
        ...tellerQueue,
        currentTicket: null,
      },
    });

    try {
      await queueApi.completeTicket(ticketId, notes);
    } catch (error) {
      // Rollback
      set({ tellerQueue });
      throw error;
    }
  },

  markNoShow: async (ticketId: string) => {
    const { tellerQueue } = get();
    if (!tellerQueue) return;

    set({
      tellerQueue: {
        ...tellerQueue,
        currentTicket: null,
      },
    });

    try {
      await queueApi.markNoShow(ticketId);
    } catch (error) {
      set({ tellerQueue });
      throw error;
    }
  },

  transferTicket: async (ticketId: string, targetServiceId: string, notes?: string) => {
    const { tellerQueue } = get();
    if (!tellerQueue) return;

    set({
      tellerQueue: {
        ...tellerQueue,
        currentTicket: null,
      },
    });

    try {
      await queueApi.transferTicket(ticketId, targetServiceId, notes);
    } catch (error) {
      set({ tellerQueue });
      throw error;
    }
  },

  // Socket event handlers
  handleTicketCreated: (data) => {
    const { branchStatus, tellerQueue } = get();

    // Update branch status if loaded
    if (branchStatus) {
      set({
        branchStatus: {
          ...branchStatus,
          waitingTickets: [...branchStatus.waitingTickets, data.ticket],
          stats: {
            ...branchStatus.stats,
            totalWaiting: branchStatus.stats.totalWaiting + 1,
          },
        },
      });
    }

    // Update teller queue if loaded
    if (tellerQueue) {
      // Add to next tickets if relevant to teller's services
      const _tellerServiceIds = tellerQueue.counter?.services.map((s) => s.id) || [];
      // Would need service ID in ticket data to filter properly
      void _tellerServiceIds; // TODO: Filter tickets by service
    }
  },

  handleTicketCalled: (data) => {
    const { branchStatus, ticketPosition } = get();

    // Update branch status
    if (branchStatus) {
      const updatedWaiting = branchStatus.waitingTickets.filter(
        (t) => t.id !== data.ticket.id
      );

      // Update counter's current ticket
      const updatedCounters = branchStatus.counters.map((c) =>
        c.number === data.counterNumber
          ? { ...c, currentTicket: data.ticket }
          : c
      );

      set({
        branchStatus: {
          ...branchStatus,
          waitingTickets: updatedWaiting,
          counters: updatedCounters,
          stats: {
            ...branchStatus.stats,
            totalWaiting: updatedWaiting.length,
          },
        },
      });
    }

    // Update ticket position if tracking this ticket
    if (ticketPosition && ticketPosition.ticketId === data.ticket.id) {
      set({
        ticketPosition: {
          ...ticketPosition,
          status: 'called',
          position: 0,
          counterNumber: data.counterNumber,
        },
      });
    }
  },

  handleTicketCompleted: (data) => {
    const { branchStatus, ticketPosition } = get();

    if (branchStatus) {
      // Clear counter's current ticket
      const updatedCounters = branchStatus.counters.map((c) =>
        c.currentTicket?.id === data.ticketId
          ? { ...c, currentTicket: null }
          : c
      );

      set({
        branchStatus: {
          ...branchStatus,
          counters: updatedCounters,
          stats: {
            ...branchStatus.stats,
            totalServed: branchStatus.stats.totalServed + 1,
          },
        },
      });
    }

    if (ticketPosition && ticketPosition.ticketId === data.ticketId) {
      set({
        ticketPosition: {
          ...ticketPosition,
          status: 'completed',
        },
      });
    }
  },

  handleQueueUpdated: (data) => {
    // data is the full QueueStatus object from backend
    if (data) {
      set({ branchStatus: data });
    }
  },

  reset: () => {
    set({
      branchStatus: null,
      isLoadingBranchStatus: false,
      ticketPosition: null,
      isLoadingTicketPosition: false,
      tellerQueue: null,
      isLoadingTellerQueue: false,
      isCallingNext: false,
    });
  },
}));
