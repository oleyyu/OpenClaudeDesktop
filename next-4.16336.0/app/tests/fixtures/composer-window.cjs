const { app, BrowserWindow } = require("electron");
app.whenReady().then(() => {
  const window = new BrowserWindow({
    width: 1468,
    height: 852,
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  window.loadURL(
    process.env.COMPOSER_FIXTURE_URL ||
      "http://127.0.0.1:4321/composer-fixture.html",
  );
});
app.on("window-all-closed", () => app.quit());
