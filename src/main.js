const path = require('path')
const { app, Tray, globalShortcut, Menu } = require('electron')
const settings = require('electron-settings');

const { notifyUser } = require("./notifyUser")
const { mic } = require('./mic')
const { LPD8 } = require('./lpd8')
const { TrayIcon, TrayBlinkingIcon } = require('./trayIcon')
const { ledMatrix } = require('./ledMatrix')
const { MqttNotifier } = require('./mqttNotifier')

const iconTrayLivePath = path.join(__dirname, 'images', 'live_22.png')
const iconTrayLiveInvPath = path.join(__dirname, 'images', 'live-inv_22.png')
const iconTrayMutedPath = path.join(__dirname, 'images', 'mic-mute_22.png')

const iconBallonLivePath = path.join(__dirname, 'images', 'on-air.png')
const iconBallonMicMutedPath = path.join(__dirname, 'images', 'mic-muted.png')

const iconTrayMuted = new TrayIcon(iconTrayMutedPath)
const iconTrayLive = new TrayIcon(iconTrayLivePath)
const iconTrayLiveBlinking = new TrayBlinkingIcon(iconTrayLivePath, iconTrayLiveInvPath)

let led = new ledMatrix('http://10.9.9.224:5000')
let mqttNotifier = new MqttNotifier('tcp://10.9.9.224:1883')
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
  iconTrayMuted.set(tray)
  if (notifications.midi && midi.isConnected()) midi.setOn()
  if (notifications.popup) notifyUser("Mic is MUTED", 'Handle MIDI command', iconBallonMicMutedPath)
  if (notifications.led) led.marqueeText('mute')
  if (notifications.mqtt) mqttNotifier.notifyMuted()
}

function onUnmuted() {
  if (notifications.trayBlinking) iconTrayLiveBlinking.set(tray)
  else iconTrayLive.set(tray)

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
  settings.setSync('notificationSettings', notifications)
}

function loadNotificationSettings() {
  var cfg = settings.getSync('notificationSettings')

  notifications.led = cfg.led !== undefined ? cfg.led : true;
  notifications.midi = cfg.midi !== undefined ? cfg.midi : true;
  notifications.mqtt = cfg.mqtt !== undefined ? cfg.mqtt : true;
  notifications.trayBlinking = cfg.trayBlinking !== undefined ? cfg.trayBlinking : true;
  notifications.popup = cfg.popup !== undefined ? cfg.popup : false;
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
  notifications.mqtt = !sender.checked
  if (notifications.mqtt) notifications.mqtt = mqttNotifier.reconnect()
  else mqttNotifier.stop()

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

mic.onMuted(() => onMuted())
mic.onUnmuted(() => onUnmuted())
mic.onVolumeChanged(vol => onVolumeChanged(vol))

mqttNotifier.onMuted(() => { if (notifications.mqtt) mute() })
mqttNotifier.onUnmuted(() => { if (notifications.mqtt) unmute() })
mqttNotifier.onLevel((val) => { if (notifications.mqtt) mic.setDesiredVolume(val) })

app.on('ready', () => loadNotificationSettings())
app.on('ready', () => midi = new MidiConfig(LPD8('LPD8')))
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
