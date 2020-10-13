import { connect } from 'mqtt'
import { EventEmitter } from 'events'

const MicMuteStrings = ['off', '0', 'mute', 'muted', 'false', 'inactive', 'disabled']
const MicActiveStrings = ['on', '1', 'active', 'unmuted', 'true', 'enabled', 'onair', 'live']

class MqttNotifier {
  constructor(url) {
    var self = this
    var client = connect(url)

    this.onMuted = function (cb) {
      return self.on('onMuted', cb)
    }

    this.onUnmuted = function (cb) {
      return self.on('onUnmuted', cb)
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

    this.reconnect = function() { 
      client.reconnect()
    }

    this.stop = function () {
      client.unsubscribe('ay-mbpro/mic/set')
      client.unsubscribe('ay-mbpro/mic/set/level')
      client.end()
    }

    function onMicStateNotification(value) {
      if (MicMuteStrings.findIndex(value) != -1) self.emit('onMuted')
      else if (MicActiveStrings.findIndex(value) != -1) self.emit('onUnmuted')
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
}

MqttNotifier.prototype = Object.create(EventEmitter.prototype);

const _MqttNotifier = MqttNotifier
export { _MqttNotifier as MqttNotifier }