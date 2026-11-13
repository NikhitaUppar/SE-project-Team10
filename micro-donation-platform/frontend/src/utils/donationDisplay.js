const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export const formatDonationAmount = amount => money.format(Number(amount));

export function formatDonationTime(value, now = Date.now()) {
  if (!value) return 'Date unavailable';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || !Number.isFinite(Number(now))) return 'Date unavailable';
  const seconds = (timestamp - Number(now)) / 1000;
  if (Math.abs(seconds) < 60) return 'Just now';
  const unit = Math.abs(seconds) < 3600 ? 'minute' : Math.abs(seconds) < 86400 ? 'hour' : 'day';
  const divisor = unit === 'minute' ? 60 : unit === 'hour' ? 3600 : 86400;
  const result = relative.format(Math.trunc(seconds / divisor), unit);
  return result === 'yesterday' ? 'Yesterday' : result;
}
