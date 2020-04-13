const { notifyUser } = require("./notifyUser")
const { mic } = require('./mic')
const { LPD8 } = require('./lpd8')

const path = require('path')
const { app, BrowserWindow, Tray, globalShortcut, Menu } = require('electron')

const trayMenu = Menu.buildFromTemplate([{
  label: 'Quit',
  click: () => app.quit()
}])

const iconLivePath = path.join(__dirname, 'images', 'live_22.png')
const iconLiveInvPath = path.join(__dirname, 'images', 'live-inv_22.png')
const iconMicMutedPath = path.join(__dirname, 'images', 'mic-mute_22.png')
const iconBallonLivePath = path.join(__dirname, 'images', 'on-air.png')
const iconBallonMicMutedPath = path.join(__dirname, 'images', 'mic-muted.png')

const PAD_MUTE = 48

let lpd8 = new LPD8('LPD8')
let padMute = lpd8.pad(PAD_MUTE)
let muted = false
let iconBlinkStatus = 0
let iconBlinkTimeout
let tray

padMute.whenOn(mute)
padMute.whenOff(unmute)

function mute() {
  muted = true
  mic.mute()
    .then(() => notifyUser("Mic is MUTED", 'Handle MIDI command', iconBallonMicMutedPath))
    .then(() => {
      tray.setImage(iconMicMutedPath)
      clearInterval(iconBlinkTimeout)
    })
    .then(padMute.setOn)
}

function unmute() {
  muted = false
  mic.unmute()
    .then(() => notifyUser("Mic is UNMUTED", 'Handle MIDI command', iconBallonLivePath))
    .then(() => {
      iconBlinkStatus = 0
      tray.setImage(iconLivePath)

      iconBlinkTimeout = setInterval(() => {
        if (iconBlinkStatus) {
          tray.setImage(iconLivePath) 
          iconBlinkStatus = 0
        } else {
          tray.setImage(iconLiveInvPath)
          iconBlinkStatus = 1
        }
      }, 1000)
    })
    .then(padMute.setOff)
}

function toggleMute() {
  if (muted) unmute()      
  else mute()
}

function createWindow() {
  // Create the browser window.
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })

  // and load the index.html of the app.
  win.loadFile('index.html')
}

//app.whenReady().then(createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
//    createWindow()
  }
})

app.on('ready', () => {
  tray = new Tray(iconMicMutedPath)
  tray.setToolTip('MIDI listener')

  tray.on('click', args => {
    if (args.altKey) {
      tray.popUpContextMenu(trayMenu)
    } else {
      toggleMute()
    }
  })
})

app.on('ready', () => {
  mic.getVolume().then(volume => {
    if (volume > 0) unmute()
    else mute()
  })
})

app.on('ready', () => {
  globalShortcut.register('Command+Shift+A', toggleMute)
})
