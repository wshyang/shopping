import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = async (path: string) => readFile(resolve(path), 'utf8');

describe('architecture boundaries', () => {
  it.each(['src/ui/review-panel.ts', 'src/ui/review-badge.ts'])(
    '%s does not import fetching or cache modules',
    async (path) => {
      const source = await read(path);
      expect(source).not.toMatch(/from ['"][^'"]*(?:fetching|cache)\//);
    },
  );

  it('never inserts fetched or external content with innerHTML', async () => {
    const files = [
      'src/app/start-shopper-app.ts',
      'src/domain/parse-review-count.ts',
      'src/ui/review-panel.ts',
      'src/ui/review-badge.ts',
    ];
    for (const file of files) expect(await read(file), file).not.toContain('.innerHTML');
  });

  it('keeps the manifest permission surface minimal', async () => {
    const config = await read('wxt.config.ts');
    expect(config).toContain("permissions: ['storage']");
    expect(config).toContain("host_permissions: ['https://mobile.pinduoduo.com/*']");
    expect(config).not.toMatch(/cookies|webRequest|<all_urls>/);
  });
});
