import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { requireArgument } from './cli.mjs';

const url = new URL(requireArgument('url'));
if (url.protocol !== 'https:' || url.hostname !== 'mobile.pinduoduo.com') {
  throw new Error('Capture URL must be an HTTPS mobile.pinduoduo.com URL.');
}
const output = resolve(requireArgument('output'));
const rawRoot = resolve('tests/fixtures/pdd/raw');
if (!output.startsWith(`${rawRoot}/`)) {
  throw new Error('Raw captures must be written below tests/fixtures/pdd/raw/.');
}

const browser = await chromium.connectOverCDP('http://localhost:9222');
const context = browser.contexts()[0];
if (!context) throw new Error('No Chromium context found. Start recon:browser first.');
const page = context.pages()[0] ?? (await context.newPage());
const response = await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
if (!response) throw new Error('Navigation produced no response.');
const body = await response.body();
await mkdir(dirname(output), { recursive: true });
await writeFile(output, body, { mode: 0o600 });
console.log(`Raw response saved to ${output}. Run recon:sanitize before reviewing or committing.`);
