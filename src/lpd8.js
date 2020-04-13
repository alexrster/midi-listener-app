const easymidi = require('easymidi')
const { EventEmitter } = require('events')
const PAD_CODE = ['44', '45', '46', '47', '48', '49', '4A', '4B'];

var Pad = function (padCode, lpd8) {
  var self = this

  this.whenOn = function (listener) {
    return self.on('pad-on', listener)
  }
  
  this.whenOff = function (listener) {
    return self.on('pad-off', listener)
  }
  
  this.setOn = function (velocity = 127) {
    return lpd8.sendMidi('noteon', { note: padCode, channel: 0, velocity: velocity })
  }
  
  this.setOff = function (velocity = 127) {
    return lpd8.sendMidi('noteoff', { note: padCode, channel: 0, velocity: velocity })
  }
}

Pad.prototype = Object.create(EventEmitter.prototype);

var LPD8 = function (name = 'LPD8', virtual = false) {
  var self = this
  var pads = []

  const input = new easymidi.Input(name, virtual)
  const output = new easymidi.Output(name, virtual)

  input.on('noteon', onNoteOn);
  input.on('noteoff', onNoteOff);

  this.pad = function (padCode) {
    if (!pads[padCode]) pads[padCode] = new Pad(padCode, self)
    return pads[padCode]
  }

  this.sendMidi = function (type, args) {
    return output.send(type, args)
  }

  // msg: { channel: 0, note: 44, velocity: 50, _type: 'noteon' }
  function onNoteOn(msg) {
    if (!!pads[msg.note]) {
      pads[msg.note].emit('pad-on', { midi: msg });
    }
  }

  function onNoteOff(msg) {
    if (!!pads[msg.note]) {
      pads[msg.note].emit('pad-off', { midi: msg });
    }
  }
}

exports.LPD8 = LPD8