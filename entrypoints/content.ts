import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { startShopperApp } from '../src/app/start-shopper-app';
import { adaptBrowserStorage } from '../src/storage/browser-storage';

export default defineContentScript({
  matches: ['https://mobile.pinduoduo.com/search_result.html*'],
  runAt: 'document_idle',
  main() {
    const localStorage = adaptBrowserStorage(browser.storage.local);
    const syncStorage = adaptBrowserStorage(browser.storage.sync);
    let cleanup: (() => void) | null = null;

    void startShopperApp({ localStorage, syncStorage })
      .then((stop) => {
        cleanup = stop;
      })
      .catch((error: unknown) => console.warn('[shopper] 启动失败', error));
    window.addEventListener('beforeunload', () => cleanup?.(), { once: true });
  },
});
