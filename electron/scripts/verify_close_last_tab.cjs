const { app, BrowserWindow } = require('electron');

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.whenReady().then(async () => {
  const {
    setupBrowserView,
    openTabUrl,
    closeTab,
    listTabs,
  } = require('../dist/main/browser-view.js');

  const win = new BrowserWindow({
    show: false,
    width: 900,
    height: 640,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  setupBrowserView(win);
  const before = listTabs();
  before.forEach((tab) => closeTab(tab.id));

  openTabUrl('about:blank', true);
  await delay(200);

  const target = listTabs().find((tab) => tab.active);
  if (!target) {
    throw new Error('No active tab was created');
  }

  closeTab(target.id);
  await delay(200);

  const after = listTabs();
  if (after.some((tab) => tab.id === target.id)) {
    throw new Error(`Closed tab still exists: ${target.id}`);
  }

  if (after.length !== 1 || after[0].url !== 'about:blank') {
    throw new Error(`Expected one placeholder about:blank tab, got ${JSON.stringify(after)}`);
  }

  console.log(`close-last-tab smoke ok: placeholder=${after[0].id}`);
  win.destroy();
  app.quit();
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
