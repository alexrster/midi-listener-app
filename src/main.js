const path = require('path')
const { app, Tray, globalShortcut, Menu } = require('electron')
const settings = require('electron-settings');

const { notifyUser } = require("./notifyUser")
const { mic } = require('./mic')
const { LPD8 } = require('./lpd8')
const { TrayIcon, TrayBlinkingIcon } = require('./trayIcon')

const iconTrayLivePath = path.join(__dirname, 'images', 'live_22.png')
const iconTrayLiveInvPath = path.join(__dirname, 'images', 'live-inv_22.png')
const iconTrayMutedPath = path.join(__dirname, 'images', 'mic-mute_22.png')

const iconBallonLivePath = path.join(__dirname, 'images', 'on-air.png')
const iconBallonMicMutedPath = path.join(__dirname, 'images', 'mic-muted.png')

const iconTrayMuted = new TrayIcon(iconTrayMutedPath)
const iconTrayLive = new TrayIcon(iconTrayLivePath)
const iconTrayLiveBlinking = new TrayBlinkingIcon(iconTrayLivePath, iconTrayLiveInvPath)

let midi = new MidiConfig()
let tray = null
let notifications = {
  popup: true,
  midi: true,
  trayBlinking: true
}

function onMuted() {
  tray.setIcon(iconTrayMuted)
  if (notifications.midi && midi.isConnected()) midi.setOn()
  if (notifications.popup) notifyUser("Mic is MUTED", 'Handle MIDI command', iconBallonMicMutedPath)
}

function onUnmuted() {
  if (notifications.trayBlinking) tray.setIcon(iconTrayLiveBlinking)
  else tray.setIcon(iconTrayLive)

  if (notifications.midi && midi.isConnected()) midi.setBlinking()
  if (notifications.popup) notifyUser("Mic is UNMUTED", 'Handle MIDI command', iconBallonLivePath)
}

function onVolumeChanged(vol) {
  if (notifications.popup) notifyUser("Mic Volume " + vol, 'Handle MIDI command', iconBallonLivePath)
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

function reloadSettings() {
  if (midi.isConnected() && !notifications.midi) midi.setOff()
  if (mic.isMuted()) onMuted()
  else onUnmuted()
}

function saveSettings() {
  reloadSettings()        
  settings.set('notificationSettings', notifications)
}

function MidiConfig(lpd8) {
  if (!lpd8) return

  let padMute = lpd8.getPad('PAD5')
  let knobVol = lpd8.getKnob('K1')

  padMute.onOn(() => { if (notifications.midi) mute() })
  padMute.onOff(() => { if (notifications.midi) unmute() })
  knobVol.onChange(val => { if (notifications.midi) mic.setDesiredVolume(val) })

  this.isConnected = () => true
  this.setOn = () => padMute.setOn()
  this.setOff = () => padMute.setOff()
  this.setBlinking = () => padMute.setBlinking()
}

MidiConfig.prototype.setOn = () => {}
MidiConfig.prototype.setOff = () => {}
MidiConfig.prototype.setBlinking = () => {}
MidiConfig.prototype.isConnected = () => false

function menuOnDisableNotifications(sender) {
  notifications.popup = !sender.checked
  saveSettings()
}

function menuOnDisableMidi(sender) {
  notifications.midi = !sender.checked
  saveSettings()
}

function menuOnDisableTrayBlinking(sender) {
  notifications.trayBlinking = !sender.checked
  saveSettings()
}

function createTrayMenu() {
  let vol = mic.getVolume()
  return Menu.buildFromTemplate([
    {
      label: 'Mic ' + (!!vol ? 'volume: ' + vol : 'is muted'),
      enabled: false
    },
    {
      type: 'separator'
    },
    {
      type: 'checkbox',
      label: 'Disable Notifications',
      checked: !notifications.popup,
      click: menuOnDisableNotifications
    },
    {
      type: 'checkbox',
      label: 'Disable MIDI',
      checked: !notifications.midi || !midi.isConnected(),
      enabled: midi.isConnected(),
      click: menuOnDisableMidi
    },
    {
      type: 'checkbox',
      label: 'Disable Tray Blinking',
      checked: !notifications.trayBlinking,
      click: menuOnDisableTrayBlinking
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: () => app.quit()
    }
  ])
}

function onTrayClick(args) {
  if (args.altKey) {
    tray.popUpContextMenu(createTrayMenu())
  } else {
    toggleMute()
  }
}

mic.onMuted(() => onMuted())
mic.onUnmuted(() => onUnmuted())
mic.onVolumeChanged(vol => onVolumeChanged(vol))

app.on('ready', () => midi = new MidiConfig(LPD8('LPD8')))
app.on('ready', () => notifications = settings.get('notificationSettings', notifications))
app.on('ready', () => (tray = new Tray(iconTrayMutedPath)).on('click', args => onTrayClick(args)))
app.on('ready', () => reloadSettings())
app.on('ready', () => globalShortcut.register('Command+Shift+A', () => toggleMute()))

app.on('will-quit', args => {
  if (mic.isMuted()) {
    args.preventDefault()
    mic.unmute().then(() => app.quit())
  }
})

if (app.isPackaged) app.dock.hide()