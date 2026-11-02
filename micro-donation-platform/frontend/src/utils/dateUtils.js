/**
 * Utility functions for campaign date calculations and countdowns.
 */

/**
 * Calculates and formats human-readable remaining days until a campaign deadline.
 *
 * Expected behavior:
 * - Read deadline from campaign data
 * - Display clear text: "5 days left", "1 day left", or "Ends today"
 * - If deadline has passed or campaign is closed, show "Campaign ended"
 * - If deadline is missing or invalid, do not display a misleading countdown (returns "Ongoing")
 * - Handles singular and plural day labels
 * - Prevents negative countdown values
 * - Respects campaign status (e.g. 'closed', 'completed')
 *
 * @param {Object|string|Date} campaignOrDeadline - Campaign object or deadline string/Date
 * @param {string} [status] - Optional campaign status
 * @returns {string} Human-readable countdown label
 */
export function getRemainingDaysText(campaignOrDeadline, status) {
  let deadline = campaignOrDeadline;
  let campaignStatus = status;

  if (
    campaignOrDeadline &&
    typeof campaignOrDeadline === 'object' &&
    !(campaignOrDeadline instanceof Date)
  ) {
    deadline = campaignOrDeadline.deadline;
    campaignStatus = campaignOrDeadline.status;
  }

  // 1. Respect campaign status
  if (
    campaignStatus === 'closed' ||
    campaignStatus === 'completed' ||
    campaignStatus === 'ended' ||
    campaignStatus === 'rejected'
  ) {
    return 'Campaign ended';
  }

  // 2. If no deadline is specified, return Ongoing (avoids misleading countdown)
  if (!deadline) {
    return 'Ongoing';
  }

  // 3. Parse deadline with safety for YYYY-MM-DD or ISO timestamp
  let deadlineDate;
  if (typeof deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(deadline.trim())) {
    const [y, m, d] = deadline.trim().split('-').map(Number);
    deadlineDate = new Date(y, m - 1, d, 23, 59, 59, 999);
  } else {
    deadlineDate = new Date(deadline);
  }

  if (isNaN(deadlineDate.getTime())) {
    return 'Ongoing';
  }

  const now = new Date();

  // 4. If deadline timestamp has strictly passed
  if (deadlineDate.getTime() < now.getTime()) {
    return 'Campaign ended';
  }

  // 5. Compare calendar day boundaries
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDeadline = new Date(
    deadlineDate.getFullYear(),
    deadlineDate.getMonth(),
    deadlineDate.getDate()
  ).getTime();

  const msPerDay = 1000 * 60 * 60 * 24;
  const calendarDiffDays = Math.round((startOfDeadline - startOfToday) / msPerDay);

  if (calendarDiffDays <= 0) {
    return 'Ends today';
  } else if (calendarDiffDays === 1) {
    return '1 day left';
  } else {
    return `${calendarDiffDays} days left`;
  }
}

export default {
  getRemainingDaysText,
};
