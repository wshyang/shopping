import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execute = promisify(execFile);

describe('activate-shiphats.sh', () => {
  it('renders every inert file without unresolved placeholders', async () => {
    const output = await mkdtemp(resolve(tmpdir(), 'shopper-shiphats-test-'));
    try {
      await execute(
        'bash',
        ['./activate-shiphats.sh', '--non-interactive', '--keep-inert', '--output-dir', output],
        {
          cwd: resolve('.'),
          env: {
            ...process.env,
            SHIPHATS_SONAR_PROJECT_KEY: 'shopper',
            SHIPHATS_CODEOWNERS: '@team/shopper',
          },
        },
      );
      const pipeline = await readFile(resolve(output, '.gitlab-ci.yml'), 'utf8');
      expect(pipeline).toContain('build-job:');
      expect(pipeline).toContain('deploy-final-job:');
      expect(pipeline).not.toContain('@@SHIPHATS_');
    } finally {
      await rm(output, { recursive: true, force: true });
    }
  });

  it('contains none of the Bash features excluded by the Bash 3.2 contract', async () => {
    const script = await readFile(resolve('activate-shiphats.sh'), 'utf8');
    expect(script).not.toMatch(/declare\s+-A|\bmapfile\b|\$\{[^}]+,,\}/);
  });
});
