import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: '拼多多评价助手',
    description: '在拼多多搜索结果中显示商品评价数，并支持筛选和导出。',
    version: '0.1.0',
    permissions: ['storage'],
    host_permissions: ['https://mobile.pinduoduo.com/*'],
    action: {
      default_title: '拼多多评价助手',
    },
  },
});
