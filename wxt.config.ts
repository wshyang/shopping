import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'shopper — PDD review collector',
    description: 'Collects review counts on PDD search results — inline badges + sortable panel + CSV/JSON export. Uses your own logged-in session; no credentials stored.',
    version: '0.1.0',
    permissions: ['storage'],
    host_permissions: ['https://mobile.pinduoduo.com/*'],
    action: {},
  },
  srcDir: 'src',
  entrypointsDir: 'entrypoints',
  runner: {
    disabled: true,
  },
});
