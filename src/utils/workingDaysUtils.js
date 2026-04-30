/**
 * Count Mon–Fri business days between two ISO date strings (inclusive).
 * Subtracts public holidays and personal leave days.
 *
 * @param {string} startDateStr    - "YYYY-MM-DD"
 * @param {string} endDateStr      - "YYYY-MM-DD"
 * @param {number} publicHolidays  - public holiday days to subtract
 * @param {number} leaveDays       - personal leave days to subtract
 * @returns {number} net working days (minimum 0)
 */
export function countWorkingDays(startDateStr, endDateStr, publicHolidays = 0, leaveDays = 0) {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr);
  const end   = new Date(endDateStr);
  if (isNaN(start) || isNaN(end) || end < start) return 0;

  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay(); // 0=Sun, 6=Sat
    if (day !== 0 && day !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }

  return Math.max(0, count - Number(publicHolidays || 0) - Number(leaveDays || 0));
}

/**
 * Convert seconds to mandays (8 hours = 1 manday).
 * @param {number} seconds
 * @returns {number} rounded to 1 decimal
 */
export function secondsToMandays(seconds) {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.round((seconds / 3600 / 8) * 10) / 10;
}
