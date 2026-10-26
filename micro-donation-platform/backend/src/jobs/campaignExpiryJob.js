const nodeCron = require('node-cron');
const { closeExpiredCampaigns } = require('../services/campaignLifecycle');

function startCampaignExpiryJob({
  cron = nodeCron,
  close = closeExpiredCampaigns,
  timezone = process.env.CAMPAIGN_CRON_TIMEZONE || 'Asia/Kolkata',
  logger = console,
} = {}) {
  // Reject invalid deployment settings instead of silently using host time.
  new Intl.DateTimeFormat('en', { timeZone: timezone });
  let running = false;
  const run = async () => {
    if (running) return { skipped: true };
    running = true;
    try {
      const result = await close();
      logger.info(`[Campaign expiry] Closed ${result.closedCount} expired campaign(s)`);
      return { success: true, ...result };
    } catch {
      // Do not dump credentials, query parameters, or database internals.
      logger.error('[Campaign expiry] Check failed; the next scheduled run will retry');
      return { success: false };
    } finally {
      running = false;
    }
  };
  const task = cron.schedule('0 0 * * *', run, { timezone });
  // Catch up after downtime; normal scheduled execution is daily at midnight.
  const ready = run();
  return { ready, run, stop: () => task.stop() };
}

module.exports = { startCampaignExpiryJob };
