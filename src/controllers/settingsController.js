const { BrowserWindow, ipcMain } = require('electron')

var onSettingsUpdatedCallback = function () { }
var self = {}

var settingsController = function (settings) {
  self = this
  self.settings = (settings || {})

  const win = new BrowserWindow({
    width: 800,
    height: 680,
    resizable: false,
    darkTheme: true,
    webPreferences: {
      nodeIntegration: true,
      devTools: true,
      textAreasAreResizable: false,
      worldSafeExecuteJavaScript: true
    }
  })

  this.show = function (cb) {
    onSettingsUpdatedCallback = data => { cb(data); win.close(); }

    win.once('ready-to-show', () => win.show());
    win.loadURL(`file://${__dirname}/../app/settings/index.html`);
  }
}

ipcMain.on('settings', (e, op, data) => {
  if (op == 'get') {
    e.returnValue = self.settings;
  } else if (op == 'set') {
    if (!!data) onSettingsUpdatedCallback.apply(this, [data]);
    else e.returnValue = false;
  }
})

exports.SettingsController = settingsController;
