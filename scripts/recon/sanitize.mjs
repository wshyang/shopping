/**
 * Sanitize captured fixtures: strip PII/tokens before committing.
 * Usage: npm run recon:sanitize
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURE_DIR = 'tests/fixtures/pdd';

const STRIP_PATTERNS = [
  /PDDAccessToken\s*[:=]\s*["'][^"']+["']/gi,
  /pdd_user_id\s*[:=]\s*["']?[^"',\s}]+["']?/gi,
  /pass_id\s*[:=]\s*["'][^"']+["']/gi,
  /anti_content\s*[:=]\s*["'][^"']+["']/gi,
  // phone numbers
  /\b1[3-9]\d{9}\b/g,
  // addresses (heuristic: keep structure, redact numbers)
];

for (const file of readdirSync(FIXTURE_DIR)) {
  const fullPath = join(FIXTURE_DIR, file);
  let content = readFileSync(fullPath, 'utf-8');
  let changed = false;
  for (const pattern of STRIP_PATTERNS) {
    if (pattern.test(content)) {
      content = content.replace(pattern, '[REDACTED]');
      changed = true;
    }
    pattern.lastIndex = 0;
  }
  if (changed) {
    writeFileSync(fullPath, content);
    console.log(`[sanitize] Stripped PII in ${file}`);
  }
}
console.log('[sanitize] Done. Verify fixtures contain no PDDAccessToken / pdd_user_id / phone numbers.');
