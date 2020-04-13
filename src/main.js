const path = require('path')
const { app, Tray, globalShortcut, Menu } = require('electron')

const { notifyUser } = require("./notifyUser")
const { mic } = require('./mic')
const { LPD8 } = require('./lpd8')
const { TrayIcon, TrayBlinkingIcon } = require('./trayIcon')

const trayMenu = Menu.buildFromTemplate([{
  label: 'Quit',
  click: () => app.quit()
}])

const iconLivePath = path.join(__dirname, 'images', 'live_22.png')
const iconLiveInvPath = path.join(__dirname, 'images', 'live-inv_22.png')
const iconMicMutedPath = path.join(__dirname, 'images', 'mic-mute_22.png')
const iconBallonLivePath = path.join(__dirname, 'images', 'on-air.png')
const iconBallonMicMutedPath = path.join(__dirname, 'images', 'mic-muted.png')

const iconMuted = new TrayIcon(iconMicMutedPath)
const iconLive = new TrayBlinkingIcon(iconLivePath, iconLiveInvPath)

let lpd8 = new LPD8('LPD8')
let padMute = lpd8.getPad('PAD 5')
let knobVol = lpd8.getKnob('K1')
let tray

padMute.onOn(() => mute())
padMute.onOff(() => unmute())
knobVol.onChange(val => mic.setDesiredVolume(val))

mic.onMuted(() => onMuted())
mic.onUnmuted(() => onUnmuted())

function onMuted(notify = true) {
  tray.setIcon(iconMuted)
  padMute.setOn()
  if (notify) notifyUser("Mic is MUTED", 'Handle MIDI command', iconBallonMicMutedPath)
}

function onUnmuted(notify = true) {
  tray.setIcon(iconLive)
  padMute.setBlinking()
  if (notify) notifyUser("Mic is UNMUTED", 'Handle MIDI command', iconBallonLivePath)
}

function mute() {
  return mic.mute()
}

function unmute() {
  return mic.unmute()
}

function toggleMute() {
  return mic.isMuted() ? unmute() : mute()
}

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

app.on('ready', () => mic.isMuted() ? onMuted(false) : onUnmuted(false))
app.on('ready', () => globalShortcut.register('Command+Shift+A', toggleMute))

app.on('will-quit', args => {
  if (mic.isMuted()) {
    args.preventDefault()
    mic.unmute().then(() => app.quit())
  }
})
