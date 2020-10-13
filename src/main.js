import { join } from 'path';
import { app, Tray, globalShortcut, Menu } from 'electron';
import { set, get } from 'electron-settings';

import { notifyUser } from "./notifyUser";
import { mic } from './mic';
import { LPD8 } from './lpd8';
import { TrayIcon, TrayBlinkingIcon } from './trayIcon';
import { ledMatrix } from './ledMatrix';
import { MqttNotifier } from './mqttNotifier';

const iconTrayLivePath = join(__dirname, 'images', 'live_22.png')
const iconTrayLiveInvPath = join(__dirname, 'images', 'live-inv_22.png')
const iconTrayMutedPath = join(__dirname, 'images', 'mic-mute_22.png')

const iconBallonLivePath = join(__dirname, 'images', 'on-air.png')
const iconBallonMicMutedPath = join(__dirname, 'images', 'mic-muted.png')

const iconTrayMuted = new TrayIcon(iconTrayMutedPath)
const iconTrayLive = new TrayIcon(iconTrayLivePath)
const iconTrayLiveBlinking = new TrayBlinkingIcon(iconTrayLivePath, iconTrayLiveInvPath)

let led = new ledMatrix('http://10.9.9.224:5000')
let mqttNotifier = new MqttNotifier('tcp://10.9.9.224')
let midi = new MidiConfig()
let tray = null
let notifications = {
  popup: true,
  midi: true,
  trayBlinking: true,
  led: true,
  mqtt: true
}

function onMuted() {
  tray.setIcon(iconTrayMuted)
  if (notifications.midi && midi.isConnected()) midi.setOn()
  if (notifications.popup) notifyUser("Mic is MUTED", 'Handle MIDI command', iconBallonMicMutedPath)
  if (notifications.led) led.marqueeText('mute')
  if (notifications.mqtt) mqttNotifier.notifyMuted()
}

function onUnmuted() {
  if (notifications.trayBlinking) tray.setIcon(iconTrayLiveBlinking)
  else tray.setIcon(iconTrayLive)

  if (notifications.midi && midi.isConnected()) midi.setBlinking()
  if (notifications.popup) notifyUser("Mic is UNMUTED", 'Handle MIDI command', iconBallonLivePath)
  if (notifications.led) led.setBlinkingText('LIVE')
  if (notifications.mqtt) mqttNotifier.notifyUnmuted()
}

function onVolumeChanged(vol) {
  if (notifications.popup) notifyUser("Mic Volume " + vol + '%', 'Handle MIDI command', iconBallonLivePath)
  if (notifications.led) led.setText(vol + '%', false, 1200).then(() => new Promise((resolve, _) => setTimeout(resolve, 1200))).then(() => led.setBlinkingText('LIVE'))
  if (notifications.mqtt) mqttNotifier.notifyLevelChanged(vol)
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
  set('notificationSettings', notifications)
}

function MidiConfig(lpd8) {
  if (!lpd8) return;

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

function menuOnDisableLed(sender) {
  if (!sender.checked) led.clear()

  notifications.led = !sender.checked
  saveSettings()
}

function menuOnDisableMqtt(sender) {
  if (!sender.checked) mqttNotifier.stop()

  notifications.mqtt = !sender.checked
  saveSettings()
}

function createTrayMenu() {
  let vol = mic.getVolume()
  return Menu.buildFromTemplate([
    {
      label: 'Mic ' + (!!vol ? 'volume: ' + vol + '%' : 'is muted'),
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
      type: 'checkbox',
      label: 'Disable Led',
      checked: !notifications.led,
      click: menuOnDisableLed
    },
    {
      type: 'checkbox',
      label: 'Disable MQTT',
      checked: !notifications.mqtt,
      click: menuOnDisableMqtt
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

function loadNotificationSettings() {
  var n = get('notificationSettings', notifications)
  if (n.led === undefined) n.led = true
  if (n.mqtt === undefined) n.mqtt = true
  return n
}

mic.onMuted(() => onMuted())
mic.onUnmuted(() => onUnmuted())
mic.onVolumeChanged(vol => onVolumeChanged(vol))

mqttNotifier.onMuted(() => { if (notifications.mqtt) mute() })
mqttNotifier.onUnmuted(() => { if (notifications.mqtt) unmute() })

app.on('ready', () => midi = new MidiConfig(LPD8('LPD8')))
app.on('ready', () => notifications = loadNotificationSettings())
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
