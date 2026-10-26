const { execFileSync } = require('child_process');
const path = require('path');

test('campaign progress updates pass isolated PostgreSQL, real JWT, and Supabase-client integration checks', () => {
  try {
    const output = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tests/campaignUpdates/flow.cjs'], {
      cwd: path.join(__dirname, '..'), encoding: 'utf8', timeout: 60000,
      env: { ...process.env, NODE_ENV: 'test' },
    });
    expect(output).toMatch(/# fail 0/);
  } catch (error) {
    throw new Error(`Campaign updates integration failed: ${error.message}\n${error.stdout || ''}\n${error.stderr || ''}`);
  }
}, 65000);
