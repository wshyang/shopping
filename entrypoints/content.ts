import { mountApp } from "../src/app";
export default defineContentScript({
  matches: ["https://mobile.pinduoduo.com/search_result.html*"],
  async main(context) {
    const cleanup = await mountApp();
    context.onInvalidated(cleanup);
  },
});
