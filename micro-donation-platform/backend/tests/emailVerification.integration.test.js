const { execFileSync } = require('child_process');
const path = require('path');

test('email verification passes isolated PostgreSQL + real Nodemailer/SMTP integration checks', () => {
  try {
    const output = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tests/integration/emailVerification.cjs'], {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      timeout: 60000,
      env: { ...process.env, NODE_ENV: 'test' },
    });
    expect(output).toMatch(/# fail 0/);
  } catch (error) {
    throw new Error(`Verification integration failed: ${error.message}\n${error.stdout || ''}\n${error.stderr || ''}`);
  }
}, 65000);
