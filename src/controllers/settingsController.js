const { BrowserWindow, ipcMain } = require('electron')

var settingsController = function (settings) {
  var self = this
  self.settings = (settings || {})

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      devTools: true,
      textAreasAreResizable: false,
      worldSafeExecuteJavaScript: true
    }
  })

  this.onSettingsUpdatedCallback = function () { }

  this.show = function () {
    win.once('ready-to-show', () => win.show());

    win.loadURL(`file://${__dirname}/../app/settings/index.html`)
  }

  this.onSettingsUpdated = function (cb) {
    self.onSettingsUpdatedCallback = cb
  }

  ipcMain.handle('perform-action', (event, ...args) => {
    var d = (args[0] || {})
    if (d.action === 'settings.set') {
      self.onSettingsUpdatedCallback.call(this, d.settings)
    }
  })

  ipcMain.on('settings', (e, op, data) => {
    if (op == 'get') {
      e.returnValue = self.settings;
    } else if (op == 'set') {
      if (!!data) self.onSettingsUpdatedCallback.call(this, data)
      else e.returnValue = false;
    }
  })
}

exports.SettingsController = settingsController
