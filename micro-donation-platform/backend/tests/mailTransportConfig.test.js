jest.mock('nodemailer', () => ({ createTransport: jest.fn(() => ({})) }));

const original = { ...process.env };
beforeEach(() => { jest.resetModules(); process.env = { ...original }; });
afterEach(() => { process.env = original; });

function options(env) {
  Object.assign(process.env, env);
  require('../src/controllers/emailController');
  return require('nodemailer').createTransport.mock.calls.at(-1)[0];
}

test('Gmail on port 587 requires TLS and accepts the spaced app-password format', () => {
  const config = options({ SMTP_HOST: 'smtp.gmail.com', SMTP_PORT: '587', SMTP_USER: 'sender@example.test', SMTP_PASS: 'abcd efgh ijkl mnop' });
  expect(config).toMatchObject({ host: 'smtp.gmail.com', port: 587, secure: false, requireTLS: true, auth: { user: 'sender@example.test', pass: 'abcdefghijklmnop' } });
  expect(config.connectionTimeout).toBe(15000);
});

test('port 465 uses implicit TLS', () => {
  expect(options({ SMTP_HOST: 'smtp.gmail.com', SMTP_PORT: '465' })).toMatchObject({ secure: true, requireTLS: false });
});

test('isolated local SMTP tests continue to work without authentication or TLS', () => {
  expect(options({ SMTP_HOST: '127.0.0.1', SMTP_PORT: '1025', SMTP_USER: '', SMTP_PASS: '' })).toMatchObject({ secure: false, requireTLS: false, auth: undefined });
});
