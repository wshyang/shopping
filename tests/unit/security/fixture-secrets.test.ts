import { readdir, readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const forbidden = [
  /PDDAccessToken/i,
  /pdd_user_id/i,
  /anti_content/i,
  /access[_-]?token/i,
  /\b(?:\+?86[- ]?)?1[3-9]\d{9}\b/,
];

describe('committed PDD fixtures', () => {
  it('contain no credential or phone markers', async () => {
    const root = resolve('tests/fixtures/pdd/sanitized');
    const files = await listFixtureFiles(root);
    for (const file of files) {
      const content = await readFile(file, 'utf8');
      forbidden.forEach((pattern) =>
        expect(content, `${file} matched ${pattern}`).not.toMatch(pattern),
      );
    }
  });
});

async function listFixtureFiles(root: string): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const path = resolve(root, entry.name);
        if (entry.isDirectory()) return listFixtureFiles(path);
        return ['.html', '.json'].includes(extname(path)) ? [path] : [];
      }),
    );
    return nested.flat();
  } catch (error) {
    if (isMissingFileError(error)) return [];
    throw error;
  }
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
