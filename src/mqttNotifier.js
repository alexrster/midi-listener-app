const mqtt = require('mqtt')
const { EventEmitter } = require('events')

const MicMuteStrings = ['off', '0', 'mute', 'muted', 'false', 'inactive', 'disabled']
const MicActiveStrings = ['on', '1', 'active', 'unmute', 'unmuted', 'true', 'enabled', 'onair', 'live']

var MqttNotifier = function(url) {
  var self = this
  var client = mqtt.connect(url)

  this.onMuted = function (cb) {
    return self.on('onMuted', cb)
  }

  this.onUnmuted = function (cb) {
    return self.on('onUnmuted', cb)
  }

  this.onLevel = function (cb) {
    return self.on('onLevel', cb)
  }

  this.notifyMuted = function () {
    client.publish('ay-mbpro/mic', MicMuteStrings[0])
  }

  this.notifyUnmuted = function () {
    client.publish('ay-mbpro/mic', MicActiveStrings[0])
  }

  this.notifyLevelChanged = function (value) {
    client.publish('ay-mbpro/mic/level', value)
  }

  this.isConnected = function () {
    return client.connected;
  }

  this.reconnect = function(opts = {}) { 
    if (client.connected) return true

    client.reconnect(opts)
    return client.connected
  }

  this.stop = function () {
    if (client.connected) {
      client.unsubscribe('ay-mbpro/mic/set')
      client.unsubscribe('ay-mbpro/mic/set/level')
      client.end()
    }
  }

  function onMicStateNotification(value) {
    if (MicMuteStrings.indexOf(value) != -1) self.emit('onMuted')
    else if (MicActiveStrings.indexOf(value) != -1) self.emit('onUnmuted')
  }

  function onMicLevelNotification(value) {
    var level = Number(value)
    if (!isNaN(level) && level >= 0 && level <= 100) self.emit('onLevel', level)
  }

  client.on('connect', () => {
    client.subscribe('ay-mbpro/mic/set')
    client.subscribe('ay-mbpro/mic/set/level')
  })

  client.on('message', (topic, message) => {
    var value = message.toString().toLowerCase().trim()
    if ('ay-mbpro/mic/set' === topic) onMicStateNotification(value)
    else if ('ay-mbpro/mic/set/level' === topic) onMicLevelNotification(value)
  })
}

MqttNotifier.prototype = Object.create(EventEmitter.prototype);

exports.MqttNotifier = MqttNotifier