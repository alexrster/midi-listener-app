const { BrowserWindow, ipcMain } = require('electron')

var settingsController = function () {
  var self = this

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      //nodeIntegration: true,
      devTools: true,
      textAreasAreResizable: false
    }
  })

  this.onSettingsUpdatedCallback = function () { }

  this.show = function () {
    win.loadURL(`file://${__dirname}/../app/settings/index.html`)
    win.once('ready-to-show', () => {
      win.show()
    })
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
}

exports.SettingsController = settingsController
