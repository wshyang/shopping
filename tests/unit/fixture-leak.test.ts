import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURE_DIR = join(import.meta.dirname, '..', 'fixtures', 'pdd');
const PHONE_RE = /\b1[3-9]\d{9}\b/;

describe('fixture sanitization', () => {
  it('fixtures contain no credentials or phone numbers', () => {
    const files = readdirSync(FIXTURE_DIR).filter((file) => file.endsWith('.html') || file.endsWith('.json'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const content = readFileSync(join(FIXTURE_DIR, file), 'utf-8');
      expect(content, `${file} should not contain PDDAccessToken`).not.toContain('PDDAccessToken');
      expect(content, `${file} should not contain pdd_user_id`).not.toContain('pdd_user_id');
      expect(content, `${file} should not contain anti_content token`).not.toContain('anti_content');
      expect(content, `${file} should not contain phone number`).not.toMatch(PHONE_RE);
    }
  });
});
