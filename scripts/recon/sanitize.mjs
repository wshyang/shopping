import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { requireArgument } from './cli.mjs';

const inputRoot = resolve(requireArgument('input'));
const outputRoot = resolve(requireArgument('output'));
if (!inputRoot.includes('/tests/fixtures/pdd/raw'))
  throw new Error('Input must be under tests/fixtures/pdd/raw/.');
if (!outputRoot.includes('/tests/fixtures/pdd/sanitized'))
  throw new Error('Output must be under tests/fixtures/pdd/sanitized/.');
if (outputRoot.startsWith(`${inputRoot}/`) || outputRoot === inputRoot)
  throw new Error('Output must be separate from raw input.');

const files = await listFiles(inputRoot);
for (const input of files) {
  const output = resolve(outputRoot, relative(inputRoot, input));
  const text = await readFile(input, 'utf8');
  const sanitized = sanitizeDocument(text, extname(input).toLowerCase());
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, sanitized, { mode: 0o600 });
}
console.log(
  `Sanitized ${files.length} text file(s). Manual review and the fixture credential test are still required.`,
);

async function listFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = resolve(root, entry.name);
      return entry.isDirectory() ? listFiles(path) : [path];
    }),
  );
  return nested.flat();
}

function sanitizeDocument(text, extension) {
  if (extension === '.json') {
    try {
      return `${JSON.stringify(sanitizeValue(JSON.parse(text)), null, 2)}\n`;
    } catch {
      return sanitizeText(text);
    }
  }
  return sanitizeText(text);
}

function sanitizeValue(value) {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!value || typeof value !== 'object')
    return typeof value === 'string' ? sanitizeText(value) : value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !isSensitiveKey(key))
      .map(([key, child]) => [key, sanitizeValue(child)]),
  );
}

function isSensitiveKey(key) {
  return /(?:token|cookie|authorization|pdd_user_id|user_?id|phone|mobile|address|anti_content|fingerprint)/i.test(
    key,
  );
}

function sanitizeText(text) {
  return text
    .replace(
      /(PDDAccessToken|pdd_user_id|anti_content|access_?token)(["'=:\s%]+)[^&"'\s<]+/gi,
      '[REDACTED_KEY]$2[REDACTED]',
    )
    .replace(/\b(?:\+?86[- ]?)?1[3-9]\d{9}\b/g, '[REDACTED_PHONE]')
    .replace(/([?&](?:token|access_token|anti_content|pdd_user_id)=)[^&#"'\s]+/gi, '$1[REDACTED]');
}
