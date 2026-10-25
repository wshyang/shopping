import { defineConfig } from "wxt";
export default defineConfig({
  manifest: {
    name: "商品评价助手",
    description: "在拼多多搜索页比较商品评价数量",
    permissions: ["storage"],
    host_permissions: ["https://mobile.pinduoduo.com/*"],
  },
});
