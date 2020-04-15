const path = require('path')
const { app, Tray, globalShortcut, Menu, MenuItem } = require('electron')
const settings = require('electron-settings');

const { notifyUser } = require("./notifyUser")
const { mic } = require('./mic')
const { LPD8 } = require('./lpd8')
const { TrayIcon, TrayBlinkingIcon } = require('./trayIcon')

const iconLivePath = path.join(__dirname, 'images', 'live_22.png')
const iconLiveInvPath = path.join(__dirname, 'images', 'live-inv_22.png')
const iconMicMutedPath = path.join(__dirname, 'images', 'mic-mute_22.png')
const iconBallonLivePath = path.join(__dirname, 'images', 'on-air.png')
const iconBallonMicMutedPath = path.join(__dirname, 'images', 'mic-muted.png')

const iconMuted = new TrayIcon(iconMicMutedPath)
const iconLive = new TrayBlinkingIcon(iconLivePath, iconLiveInvPath)

const lpd8 = new LPD8('LPD8')
const padMute = lpd8.getPad('PAD 5')
const knobVol = lpd8.getKnob('K1')

let tray
let notifications = true, midi = true
let trayMenu

padMute.onOn(() => { if (midi) mute() })
padMute.onOff(() => { if (midi) unmute() })
knobVol.onChange(val => { if (midi) mic.setDesiredVolume(val) })

mic.onMuted(() => onMuted())
mic.onUnmuted(() => onUnmuted())
mic.onVolumeChanged(vol => onVolumeChanged(vol))

function onMuted() {
  tray.setIcon(iconMuted)
  if (midi) padMute.setOn()
  if (notifications) notifyUser("Mic is MUTED", 'Handle MIDI command', iconBallonMicMutedPath)
}

function onUnmuted() {
  tray.setIcon(iconLive)
  if (midi) padMute.setBlinking()
  if (notifications) notifyUser("Mic is UNMUTED", 'Handle MIDI command', iconBallonLivePath)
}

function onVolumeChanged(vol) {
  if (notifications) notifyUser("Mic Volume " + vol, 'Handle MIDI command', iconBallonLivePath)
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

function saveSettings() {
  settings.set('notifications', notifications)
  settings.set('midi', midi)
}

app.on('ready', () => {
  notifications = settings.get('notifications', true)
  midi = settings.get('midi', true)

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
      checked: !notifications,
      click: sender => {
        notifications = !sender.checked
        saveSettings()
      }
    },
    {
      type: 'checkbox',
      label: 'Disable MIDI',
      checked: !midi,
      click: sender => {
        midi = !sender.checked
        if (midi) {
          if (mic.isMuted()) padMute.setOn()
          else padMute.setBlinking()
        }
        else padMute.setOff()
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
  tray = new Tray(iconMicMutedPath)

  tray.on('click', args => {
    if (args.altKey) {
      tray.popUpContextMenu(trayMenu)
    } else {
      toggleMute()
    }
  })
})

app.on('ready', () => mic.isMuted() ? onMuted() : onUnmuted())
app.on('ready', () => onVolumeChanged())
app.on('ready', () => globalShortcut.register('Command+Shift+A', toggleMute))

app.on('will-quit', args => {
  if (mic.isMuted()) {
    args.preventDefault()
    mic.unmute().then(() => app.quit())
  }
})

app.dock.hide()