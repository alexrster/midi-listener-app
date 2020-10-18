const mqtt = require('mqtt')
const { EventEmitter } = require('events')

const MicMuteStrings = ['off', '0', 'mute', 'muted', 'false', 'inactive', 'disabled', '-']
const MicActiveStrings = ['on', '1', 'active', 'unmute', 'unmuted', 'true', 'enabled', 'onair', 'live', '+']

var MqttNotifier = function() {
  var self = this
  var client = null
  var topics = []

  this.onMuted = function (cb) {
    return self.on('onMuted', cb)
  }

  this.onUnmuted = function (cb) {
    return self.on('onUnmuted', cb)
  }

  this.onLevel = function (cb) {
    return self.on('onLevel', cb)
  }

  this.on = function (event, cb) {
    if (topics.indexOf(event) === -1) topics.push(event)
    if (self.isConnected()) client.subscribe(event)

    return EventEmitter.prototype.on.bind(self)(event, cb)
  }

  this.notifyMuted = function () {
    self.notify('ay-mbpro/mic', MicMuteStrings[0])
  }

  this.notifyUnmuted = function () {
    self.notify('ay-mbpro/mic', MicActiveStrings[0])
  }

  this.notifyLevelChanged = function (value) {
    self.notify('ay-mbpro/mic/level', String(value))
  }

  this.notify = function (topic, value) {
    if (self.isConnected()) client.publish(topic, value)
  }

  this.isConnected = function () {
    return !!client && client.connected;
  }

  this.stop = function () {
    if (self.isConnected()) {
      topics.forEach(v => client.unsubscribe(v))
      topics = []

      client.end()
    }
  }

  function onMicStateNotification(value) {
    if (MicMuteStrings.indexOf(value) != -1) self.emit('onMuted')
    else if (MicActiveStrings.indexOf(value) != -1) self.emit('onUnmuted')
  }

  function onMicLevelNotification(value) {
    var level = Number(value)
    if (!isNaN(level) && level >= 0 && level <= 100) self.emit('onLevel', String(level))
  }

  this.connect = function(url) {
    client = mqtt.connect(url)

    client.on('connect', () => {      
      topics.forEach(v => client.subscribe(v))
    })
  
    client.on('message', (topic, message) => {
      var value = message.toString().toLowerCase().trim()
      if (!!topic && topics.indexOf(topic) >= 0) self.emit(topic, value)
    })

    self.on('ay-mbpro/mic/set', onMicStateNotification)
    self.on('ay-mbpro/mic/set/level', onMicLevelNotification)
  }
}

MqttNotifier.prototype = Object.create(EventEmitter.prototype);

exports.MqttNotifier = MqttNotifier