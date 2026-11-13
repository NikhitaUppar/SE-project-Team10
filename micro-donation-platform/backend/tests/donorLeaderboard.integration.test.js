const { execFileSync } = require('child_process');
const path = require('path');

test('donor leaderboard passes real PostgreSQL/route and frontend formatting checks', () => {
  try {
    const output = execFileSync(process.execPath, ['--test', '--test-reporter=tap', 'tests/donorLeaderboard/flow.cjs', 'tests/donorLeaderboard/display.cjs'], {
      cwd: path.join(__dirname, '..'), encoding: 'utf8', timeout: 60000, env: { ...process.env, NODE_ENV: 'test' },
    });
    expect(output).toMatch(/# fail 0/);
  } catch (error) { throw new Error(`Leaderboard integration failed:\n${error.stdout || ''}\n${error.stderr || ''}`); }
}, 65000);
