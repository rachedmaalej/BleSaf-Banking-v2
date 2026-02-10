/**
 * SMS message templates for ticket notifications.
 * All messages kept under 160 chars for single-segment SMS billing.
 */

interface ConfirmationData {
  branchName: string;
  ticketNumber: string;
  position: number;
  estimatedWait: number;
  trackingUrl: string;
}

interface ApproachingData {
  branchName: string;
  position: number;
  trackingUrl: string;
}

interface CalledData {
  branchName: string;
  ticketNumber: string;
  counterNumber: number;
}

export const smsTemplates = {
  /** Confirmation SMS sent right after check-in */
  confirmation(data: ConfirmationData): string {
    return [
      `BléSaf - ${data.branchName}`,
      `Ticket: ${data.ticketNumber}`,
      `Position: ${data.position} | ~${data.estimatedWait} min`,
      `Suivez en direct: ${data.trackingUrl}`,
    ].join('\n');
  },

  /** Approaching SMS when position <= notifyAtPosition */
  approaching(data: ApproachingData): string {
    return [
      `BléSaf - Votre tour approche!`,
      `Position: ${data.position} - Rendez-vous a ${data.branchName}`,
      `Suivi: ${data.trackingUrl}`,
    ].join('\n');
  },

  /** Called SMS when it's the customer's turn */
  called(data: CalledData): string {
    return [
      `BléSaf - C'est votre tour!`,
      `Guichet ${data.counterNumber} - ${data.branchName}`,
      `Ticket: ${data.ticketNumber}`,
    ].join('\n');
  },
};
