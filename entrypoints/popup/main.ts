import { browser } from 'wxt/browser';
import { loadSettings, saveSettings } from '../../src/settings/settings';
import { mountSettingsForm } from '../../src/settings/settings-form';
import { adaptBrowserStorage } from '../../src/storage/browser-storage';

const app = document.querySelector<HTMLElement>('#app');
const storage = adaptBrowserStorage(browser.storage.sync);

if (app) {
  void loadSettings(storage)
    .then((settings) =>
      mountSettingsForm(app, settings, async (value) => {
        await saveSettings(storage, value);
      }),
    )
    .catch(() => {
      app.textContent = '无法加载设置，请重新打开扩展。';
    });
}
