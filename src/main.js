const path = require('path')
const { app, Tray, globalShortcut, Menu, MenuItem } = require('electron')
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

let midi = null
let notifications = {
  popup: true,
  midi: true,
  trayBlinking: true
}

let tray
let trayMenu

mic.onMuted(() => onMuted())
mic.onUnmuted(() => onUnmuted())
mic.onVolumeChanged(vol => onVolumeChanged(vol))

function onMuted() {
  tray.setIcon(iconTrayMuted)
  if (notifications.midi && !!midi) midi.padMute.setOn()
  if (notifications.popup) notifyUser("Mic is MUTED", 'Handle MIDI command', iconBallonMicMutedPath)
}

function onUnmuted() {
  if (notifications.trayBlinking) tray.setIcon(iconTrayLiveBlinking)
  else tray.setIcon(iconTrayLive)

  if (notifications.midi && !!midi) midi.padMute.setBlinking()
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
  if (!!midi && !notifications.midi) midi.padMute.setOff()

  if (mic.isMuted()) onMuted()
  else onUnmuted()
}

function saveSettings() {
  settings.set('notificationSettings', notifications)
}

function startMidi () {
  let lpd8 = LPD8('LPD8')
  if (!lpd8) return

  midi = {
    lpd8: lpd8,
    padMute: lpd8.getPad('PAD5'),
    knobVol: lpd8.getKnob('K1')
  }

  midi.padMute.onOn(() => { if (notifications.midi) mute() })
  midi.padMute.onOff(() => { if (notifications.midi) unmute() })
  midi.knobVol.onChange(val => { if (notifications.midi) mic.setDesiredVolume(val) })
}

app.on('ready', () => startMidi())

app.on('ready', () => {
  notifications = settings.get('notificationSettings', notifications)

  trayMenu = Menu.buildFromTemplate([
    {
      label: 'Mic Volume: NA',
      enabled: false
    },
    {
      type: 'separator'
    },
    {
      type: 'checkbox',
      label: 'Disable Notifications',
      checked: !notifications.popup,
      click: sender => {
        notifications.popup = !sender.checked
        saveSettings()
      }
    },
    {
      type: 'checkbox',
      label: 'Disable MIDI',
      checked: !notifications.midi || !midi,
      enabled: !!midi,
      click: sender => {
        notifications.midi = !sender.checked
        reloadSettings()
        saveSettings()
      }
    },
    {
      type: 'checkbox',
      label: 'Disable Tray Blinking',
      checked: !notifications.trayBlinking,
      click: sender => {
        notifications.trayBlinking = !sender.checked
        reloadSettings()        
        saveSettings()
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: () => app.quit()
    }
  ])
})

app.on('ready', () => {
  tray = new Tray(iconTrayMutedPath)

  tray.on('click', args => {
    if (args.altKey) {
      tray.popUpContextMenu(trayMenu)
    } else {
      toggleMute()
    }
  })
})

app.on('ready', () => reloadSettings())
app.on('ready', () => onVolumeChanged())
app.on('ready', () => globalShortcut.register('Command+Shift+A', toggleMute))

app.on('will-quit', args => {
  if (mic.isMuted()) {
    args.preventDefault()
    mic.unmute().then(() => app.quit())
  }
})

app.dock.hide()