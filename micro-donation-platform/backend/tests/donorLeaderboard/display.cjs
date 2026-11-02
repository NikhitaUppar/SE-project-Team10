const { before, test } = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('url');
const path = require('path');
let display;
before(async () => { display = await import(pathToFileURL(path.join(__dirname, '../../../frontend/src/utils/donationDisplay.js')).href); });
const now = Date.parse('2030-01-10T12:00:00Z');
for (const [delta, expected] of [[1000, 'Just now'], [5 * 60000, '5 minutes ago'], [2 * 3600000, '2 hours ago'], [86400000, 'Yesterday'], [3 * 86400000, '3 days ago'], [-2 * 3600000, 'in 2 hours']]) {
  test(`relative timestamp: ${expected}`, () => { assert.equal(display.formatDonationTime(new Date(now - delta).toISOString(), now), expected); });
}
test('invalid/missing dates are safe and rupee amounts preserve paise', () => {
  for (const value of [null, undefined, '', 'broken']) assert.equal(display.formatDonationTime(value, now), 'Date unavailable');
  assert.equal(display.formatDonationAmount('1234.50'), '₹1,234.50');
});
