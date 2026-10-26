jest.mock('../src/config/supabase', () => ({ from: jest.fn() }));
jest.mock('../src/jobs/campaignExpiryJob', () => ({ startCampaignExpiryJob: jest.fn() }));
jest.mock('express', () => {
  const express = jest.requireActual('express');
  const factory = (...args) => {
    const app = express(...args);
    app.listen = jest.fn(); // Never open a real listener in startup checks.
    return app;
  };
  return Object.assign(factory, express);
});
const { startCampaignExpiryJob } = require('../src/jobs/campaignExpiryJob');
const originalEnv = process.env.NODE_ENV;

afterEach(() => { process.env.NODE_ENV = originalEnv; jest.restoreAllMocks(); });

test.each([['development', 1], ['production', 1], ['test', 0]])('app startup in %s schedules the job %i time(s)', (environment, count) => {
  process.env.NODE_ENV = environment;
  startCampaignExpiryJob.mockClear();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.isolateModules(() => {
    // Use the same mocked module instance as the isolated index module.
    const job = require('../src/jobs/campaignExpiryJob');
    require('../src/index');
    expect(job.startCampaignExpiryJob).toHaveBeenCalledTimes(count);
  });
});
