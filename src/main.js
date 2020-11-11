const appInsights = require('applicationinsights');
appInsights.setup('f9684b4f-65aa-4e8d-9f37-9c98886cd66d').start();

const path = require('path')
const { app, Tray, globalShortcut, Menu } = require('electron')
const settings = require('electron-settings');

const { actions, converters } = require("./actions")
const { notifyUser } = require("./notifyUser")
const { mic } = require('./mic')
const { LPD8 } = require('./lpd8')
const { TrayIcon, TrayBlinkingIcon } = require('./trayIcon')
const { ledMatrix } = require('./ledMatrix')
const { MqttNotifier } = require('./mqttNotifier')

const { SettingsController } = require('./controllers/settingsController');

const iconTrayLivePath = path.join(__dirname, 'images', 'live_22.png')
const iconTrayLiveInvPath = path.join(__dirname, 'images', 'live-inv_22.png')
const iconTrayMutedPath = path.join(__dirname, 'images', 'mic-mute_22.png')

const iconBallonLivePath = path.join(__dirname, 'images', 'on-air.png')
const iconBallonMicMutedPath = path.join(__dirname, 'images', 'mic-muted.png')

const iconTrayMuted = new TrayIcon(iconTrayMutedPath)
const iconTrayLive = new TrayIcon(iconTrayLivePath)
const iconTrayLiveBlinking = new TrayBlinkingIcon(iconTrayLivePath, iconTrayLiveInvPath)

let config = {
  popup: true,
  midi: true,
  trayBlinking: true,
  led: true,
  mqtt: true,
  mqttUrl: 'tcp://10.9.9.224:1883',
  eventBindings: [],
  modules: []
}

let led = new ledMatrix('http://10.9.9.224:5000')
let mqttNotifier = new MqttNotifier()
let midi = new MidiConfig()
let tray = null

function onMuted() {
  iconTrayMuted.set(tray)
  if (config.midi && midi.isConnected()) midi.setOn()
  if (config.popup) notifyUser("Mic is MUTED", 'Handle MIDI command', iconBallonMicMutedPath)
  if (config.led) led.marqueeText('mute')
  if (config.mqtt) mqttNotifier.notifyMuted()
}

function onUnmuted() {
  if (config.trayBlinking) iconTrayLiveBlinking.set(tray)
  else iconTrayLive.set(tray)

  if (config.midi && midi.isConnected()) midi.setBlinking()
  if (config.popup) notifyUser("Mic is UNMUTED", 'Handle MIDI command', iconBallonLivePath)
  if (config.led) led.setBlinkingText('LIVE')
  if (config.mqtt) mqttNotifier.notifyUnmuted()
}

function onVolumeChanged(vol) {
  if (config.popup) notifyUser("Mic Volume " + vol + '%', 'Handle MIDI command', iconBallonLivePath)
  if (config.led) led.setText(vol + '%', false, 1200).then(() => new Promise((resolve, _) => setTimeout(resolve, 1200))).then(() => led.setBlinkingText('LIVE'))
  if (config.mqtt) mqttNotifier.notifyLevelChanged(vol)
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

function reloadMqtt(url, bindings) {
  mqttNotifier.stop()

  if (!!bindings) bindings.forEach(v => { 
    if (v.type === 'mqtt') mqttNotifier.on(v.topic, actions.getActionHandler(v))
  })

  mqttNotifier.connect(url)
}

const modsConfig = [
  {
    "path": "./Wled.js",
    "config": { 
      "wleds": [
        {
          "name": "wled-05",
          "address": "http://10.9.9.124"
        },
        {
          "name": "wled-04",
          "address": "http://10.9.9.117"
        }
      ]
    }
  }
]

const eventBindingsConfig = [
  {
    "type": "mqtt",
    "topic": "wled-05/v",
    "action": "wled('wled-05').onState"
  }
]

let runningMods = []
function unloadMods(mods) {
  if (!mods || !mods.length) return;

}

function loadMods(mods) {
  if (!mods || !mods.length) return;
  mods.forEach(m => {
    try {
      if (!runningMods[m.path]) {
        runningMods[m.path] = require(m.path);
      }

      runningMods[m.path].modLoader(m.config, config, actions);
    }
    catch (e) {
      console.log(e);
    }
  })
}

function reloadSettings() {
  unloadMods(config.modules)
  loadSettings()
  loadMods(config.modules)
  midi = new MidiConfig(LPD8('LPD8'))
  reloadMqtt(config.mqttUrl, config.eventBindings)
  if (midi.isConnected() && !config.midi) midi.setOff()
  if (mic.isMuted()) onMuted()
  else onUnmuted()
}

function saveSettings(data) {
  settings.setSync('notificationSettings', (data || config))
  if (!!data) { // Restart after settings update as bindings currently cannot unsubscribe
    app.relaunch()
    return;
  }
  reloadSettings()
}

function loadSettings() {
  var cfg = (settings.getSync('notificationSettings') || {})

  config.led = cfg.led !== undefined ? cfg.led : true;
  config.midi = cfg.midi !== undefined ? cfg.midi : true;
  config.mqtt = cfg.mqtt !== undefined ? cfg.mqtt : true;
  config.trayBlinking = cfg.trayBlinking !== undefined ? cfg.trayBlinking : true;
  config.popup = cfg.popup !== undefined ? cfg.popup : false;
  config.mqttUrl = cfg.mqttUrl !== undefined ? cfg.mqttUrl : 'tcp://10.9.9.224:1883';
  config.eventBindings = cfg.eventBindings !== undefined ? cfg.eventBindings : [];
  config.modules = cfg.modules !== undefined ? cfg.modules : [];
}

function MidiConfig(lpd8) {
  if (!lpd8) return;

  let padMute = lpd8.getPad('PAD5')
  let knobVol = lpd8.getKnob('K1')

  padMute.onOn(() => { if (config.midi) mute() })
  padMute.onOff(() => { if (config.midi) unmute() })
  knobVol.onChange(val => { if (config.midi) mic.setDesiredVolume(val) })

  this.isConnected = () => true
  this.setOn = () => padMute.setOn()
  this.setOff = () => padMute.setOff()
  this.setBlinking = () => padMute.setBlinking()

  config.eventBindings.forEach(v => {
    if (v.type === 'lpd8') {
      if (!!v.pad) {
        const p = lpd8.getPad(v.pad)
        p.onOn(() => (actions.getActionHandler(v))(true))
        p.onOff(() => (actions.getActionHandler(v))(false))
      }
      else if (!!v.button) {
        const p = lpd8.getPad(v.button)
        var btnTimeout = 0
        var handler = function() { 
          (actions.getActionHandler(v))(true);

          if (btnTimeout) clearTimeout(btnTimeout);
          btnTimeout = setTimeout(() => { p.setOff(); btnTimeout = 0; }, 100); 
        }

        p.onOn(handler)
        p.onOff(() => {
          p.setOn()
          handler() 
        })
      }
      if (!!v.knob) {
        lpd8.getKnob(v.knob).onChange(val => (actions.getActionHandler(v))(val))
      }
    }
  })

  actions.lpd8 = {
    pad: function (padName) {
      return {
        set: v => v ? lpd8.getPad(padName).setOn() : lpd8.getPad(padName).setOff(),
        setBlinking: v => v ? lpd8.getPad(padName).setBlinking() : lpd8.getPad(padName).setOff()
      }
    }
  }
}

MidiConfig.prototype.setOn = () => {}
MidiConfig.prototype.setOff = () => {}
MidiConfig.prototype.setBlinking = () => {}
MidiConfig.prototype.isConnected = () => false

function menuOnDisableNotifications(sender) {
  config.popup = !sender.checked
  saveSettings()
}

function menuOnDisableMidi(sender) {
  config.midi = !sender.checked
  saveSettings()
}

function menuOnDisableTrayBlinking(sender) {
  config.trayBlinking = !sender.checked
  saveSettings()
}

function menuOnDisableLed(sender) {
  if (!sender.checked) led.clear()

  config.led = !sender.checked
  saveSettings()
}

function menuOnDisableMqtt(sender) {
  config.mqtt = !sender.checked
  if (config.mqtt) config.mqtt = mqttNotifier.reconnect()
  else mqttNotifier.stop()

  saveSettings()
}

function menuOnSettings() {
  new SettingsController(config)
    .show(data => saveSettings(data));
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
      checked: !config.popup,
      click: menuOnDisableNotifications
    },
    {
      type: 'checkbox',
      label: 'Disable MIDI',
      checked: !config.midi || !midi.isConnected(),
      enabled: midi.isConnected(),
      click: menuOnDisableMidi
    },
    {
      type: 'checkbox',
      label: 'Disable Tray Blinking',
      checked: !config.trayBlinking,
      click: menuOnDisableTrayBlinking
    },
    {
      type: 'checkbox',
      label: 'Disable Led',
      checked: !config.led,
      click: menuOnDisableLed
    },
    {
      type: 'checkbox',
      label: 'Disable MQTT',
      checked: !config.mqtt,
      click: menuOnDisableMqtt
    },
    {
      type: 'separator'
    },
    {
      label: 'Settings...',
      click: menuOnSettings,
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

mqttNotifier.onMuted(() => { if (config.mqtt) mute() })
mqttNotifier.onUnmuted(() => { if (config.mqtt) unmute() })
mqttNotifier.onLevel((val) => { if (config.mqtt) mic.setDesiredVolume(val) })

actions.mic = {
  set: v => v ? unmute() : mute(),
  setLevel: v => mic.setDesiredVolume(v)
}

actions.mqtt = {
  topic: function (topicName) {
    return {
      send: message => mqttNotifier.notify(topicName, String(message))
    }
  }
}

app.on('ready', () => (tray = new Tray(iconTrayMutedPath)).on('click', args => onTrayClick(args)))
app.on('ready', () => reloadSettings())
app.on('ready', () => globalShortcut.register('Command+Shift+A', () => toggleMute()))

app.on('will-quit', args => {
  if (mic.isMuted()) {
    args.preventDefault()
    mic.unmute().then(() => app.quit())
  }
})

app.on('window-all-closed', () => { })

if (app.isPackaged) app.dock.hide()
