jest.mock('../src/config/supabase', () => ({ from: jest.fn() }));
const { startCampaignExpiryJob } = require('../src/jobs/campaignExpiryJob');

function setup(close = jest.fn().mockResolvedValue({ closedCount: 1 }), timezone) {
  const task = { stop: jest.fn() };
  const cron = { schedule: jest.fn(() => task) };
  const logger = { info: jest.fn(), error: jest.fn() };
  return { ...startCampaignExpiryJob({ close, cron, logger, ...(timezone ? { timezone } : {}) }), close, cron, task, logger };
}

test('starts a catch-up run and schedules daily midnight in the project timezone', async () => {
  const job = setup();
  expect(await job.ready).toEqual({ success: true, closedCount: 1 });
  expect(job.close).toHaveBeenCalledTimes(1);
  expect(job.cron.schedule).toHaveBeenCalledWith('0 0 * * *', job.run, { timezone: 'Asia/Kolkata' });
  await job.cron.schedule.mock.calls[0][1]();
  expect(job.close).toHaveBeenCalledTimes(2);
  job.stop(); expect(job.task.stop).toHaveBeenCalled();
});

test('the installed cron matcher identifies midnight in the configured timezone', () => {
  const TimeMatcher = require('node-cron/src/time-matcher');
  const matcher = new TimeMatcher('0 0 * * *', 'Asia/Kolkata');
  expect(matcher.match(new Date('2030-01-01T18:30:00Z'))).toBe(true);
  expect(matcher.match(new Date('2030-01-01T18:29:59Z'))).toBe(false);
  expect(matcher.match(new Date('2030-01-02T00:00:00Z'))).toBe(false);
});

test('supports explicit timezone settings and rejects invalid deployment values', async () => {
  const job = setup(undefined, 'UTC'); await job.ready;
  expect(job.cron.schedule).toHaveBeenCalledWith('0 0 * * *', job.run, { timezone: 'UTC' });
  expect(() => setup(undefined, 'invalid/timezone')).toThrow();
});

test('skips overlapping runs and permits later checks', async () => {
  let finish;
  const close = jest.fn(() => new Promise(resolve => { finish = resolve; }));
  const job = setup(close);
  expect(await job.run()).toEqual({ skipped: true });
  finish({ closedCount: 0 }); await job.ready;
  const later = job.run(); finish({ closedCount: 0 }); await later;
  expect(close).toHaveBeenCalledTimes(2);
});

test('failed jobs are contained and the next daily invocation can retry', async () => {
  const close = jest.fn().mockRejectedValueOnce(new Error('private backend data')).mockResolvedValue({ closedCount: 0 });
  const job = setup(close);
  expect(await job.ready).toEqual({ success: false });
  expect(JSON.stringify(job.logger.error.mock.calls)).not.toContain('private backend data');
  expect(await job.run()).toEqual({ success: true, closedCount: 0 });
});
