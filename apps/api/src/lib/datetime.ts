import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay, format } from 'date-fns';

/**
 * Convert a date to UTC for storage
 * All dates in the database should be stored in UTC
 */
export function toUTC(date: Date): Date {
  return new Date(date.toISOString());
}

/**
 * Convert a UTC date to a specific timezone for display
 */
export function toBranchTime(date: Date, branchTimezone: string): Date {
  return toZonedTime(date, branchTimezone);
}

/**
 * Format a date in the branch's timezone
 */
export function formatBranchDateTime(
  date: Date,
  branchTimezone: string,
  formatStr: string = 'yyyy-MM-dd HH:mm:ss'
): string {
  return formatInTimeZone(date, branchTimezone, formatStr);
}

/**
 * Format a date in the branch's timezone for display
 */
export function formatBranchTime(date: Date, branchTimezone: string): string {
  return formatInTimeZone(date, branchTimezone, 'HH:mm');
}

/**
 * Get today's date range in UTC based on branch timezone
 * Useful for "today's tickets" queries
 */
export function getTodayRangeUTC(branchTimezone: string): { start: Date; end: Date } {
  // Get current time in branch timezone
  const nowInBranchTz = toZonedTime(new Date(), branchTimezone);

  // Get start and end of day in branch timezone
  const startOfDayInBranchTz = startOfDay(nowInBranchTz);
  const endOfDayInBranchTz = endOfDay(nowInBranchTz);

  // Convert back to UTC for database queries
  const startUTC = fromZonedTime(startOfDayInBranchTz, branchTimezone);
  const endUTC = fromZonedTime(endOfDayInBranchTz, branchTimezone);

  return { start: startUTC, end: endUTC };
}

/**
 * Get the current date string (YYYY-MM-DD) in the branch's timezone
 */
export function getTodayDateString(branchTimezone: string): string {
  return formatInTimeZone(new Date(), branchTimezone, 'yyyy-MM-dd');
}

/**
 * Get the current hour in the branch's timezone (0-23)
 */
export function getCurrentHour(branchTimezone: string): number {
  const now = toZonedTime(new Date(), branchTimezone);
  return now.getHours();
}

/**
 * Calculate duration in minutes between two dates
 */
export function calculateDurationMins(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 1000 / 60);
}

/**
 * Format duration in minutes to human-readable string
 */
export function formatDuration(mins: number): string {
  if (mins < 60) {
    return `${mins} min`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (remainingMins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMins}min`;
}
