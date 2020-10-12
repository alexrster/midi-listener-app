const mqtt = require('mqtt')
const { EventEmitter } = require('events')

var MqttNotifier = function(url) {
  var self = this
  var client = mqtt.connect(url)

  client.on('connect', () => {
    client.subscribe('ay-mbpro/mic/set')
    client.subscribe('ay-mbpro/mic/set/level')
  })

  client.on('message', (topic, message) =>  {
    if ('ay-mbpro/mic/set' === topic) {
      var value = message.toString().toLowerCase().trim()
      if ("on" === value || "1" === value || "true" === value || "unmute" === value || "unmuted" === value) {
        self.emit('onUnmuted')
      } else if ("off" === value || "0" === value || "false" === value || "mute" === value || "muted" === value)  {
        self.emit('onMuted')
      }
    } else if ('ay-mbpro/mic/set/level' === topic)  {
      var value = Number(message.toString().toLowerCase().trim())
      if (value !== NaN && value >= 0 && value <= 100) {
        self.email('onLevel', value)
      }
    }
  })

  this.onMuted = function(cb) {
    return self.on('onMuted', cb)
  }

  this.onUnmuted = function(cb) {
    return self.on('onUnmuted', cb)
  }

  this.notifyMuted = function() {
    client.publish('ay-mbpro/mic', 'off')
  }

  this.notifyUnmuted = function() {
    client.publish('ay-mbpro/mic', 'on')
  }

  this.notifyLevelChanged = function(value) {
    client.publish('ay-mbpro/mic/level', value)
  }
}

MqttNotifier.prototype = Object.create(EventEmitter.prototype);

exports.MqttNotifier = MqttNotifier