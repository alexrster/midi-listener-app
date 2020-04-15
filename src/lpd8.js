const easymidi = require('easymidi')
const { EventEmitter } = require('events')
const PROG1_PAD_CODES = ['36', '37', '38', '39', '40', '41', '42', '43']; // Channel 0
const PROG2_PAD_CODES = ['35', '36', '42', '39', '37', '38', '46', '44']; // Channel 1
const PROG3_PAD_CODES = ['60', '62', '64', '65', '67', '69', '71', '72']; // Channel 2
const PROG4_PAD_CODES = ['44', '45', '46', '47', '48', '49', '50', '51']; // Channel 0
const PROG1_CC_CODES = ['1', '2', '3', '4', '5', '6', '7', '8']
const PROG4_CC_CODES = ['1', '2', '3', '4', '5', '6', '7', '8']

var Prog = function(padCodes, knobCodes) {
  this.getPadCode = function (padNo) { 
    return padCodes[padNo - 1] 
  }

  this.getKnobCode = function (knobNo) { 
    return knobCodes[knobNo - 1] 
  }
}

var Knob = function () {
  var self = this

  this.onChange = function (listener) {
    return self.on('knob-change', listener)
  }
}

Knob.prototype = Object.create(EventEmitter.prototype);

var Pad = function (padCode, lpd8) {
  var self = this
  var blinkingHandle = null

  this.onOn = function (listener) {
    resetBlinking()
    return self.on('pad-on', listener)
  }
  
  this.onOff = function (listener) {
    resetBlinking()
    return self.on('pad-off', listener)
  }
  
  this.setOn = function (velocity = 127) {
    resetBlinking()
    return set(true, velocity)
  }
  
  this.setOff = function (velocity = 127) {
    resetBlinking()
    return set(false, velocity)
  }

  this.setBlinking = function (initial = false, interval = 667, velocity = 127) {
    resetBlinking()
    set(initial, velocity)
    blinkingHandle = setInterval(ctx => set((ctx.state = !ctx.state), velocity), interval, { state: initial })
  }

  function set (val, velocity) {
    return lpd8.sendMidi('note' + (val ? 'on' : 'off'), { note: padCode, channel: 0, velocity: velocity })
  }

  function resetBlinking () {
    if (!!blinkingHandle) {
      clearInterval(blinkingHandle)
      blinkingHandle = null
    }
  }
}

Pad.prototype = Object.create(EventEmitter.prototype);

var LPD8 = function (name = 'LPD8', virtual = false) {
  var self = this
  var pads = []
  var knobs = []

  var prog = new Prog(PROG4_PAD_CODES, PROG4_CC_CODES)

  const input = new easymidi.Input(name, virtual)
  const output = new easymidi.Output(name, virtual)

  input.on('noteon', onNoteOn);
  input.on('noteoff', onNoteOff);
  input.on('cc', onCc);

  this.getPad = function (padName) {
    var padNo = parseInt(/p(?:ad)?\s?(\d)/gi.exec(padName)[1])
    return !!padNo ? self.getPadByCode(prog.getPadCode(padNo)) : undefined
  }

  this.getKnob = function (knobName) {
    var knobNo = parseInt(/k(?:nob)?\s?(\d)/gi.exec(knobName)[1])
    return !!knobNo ? self.getKnobByCode(prog.getKnobCode(knobNo)).knob : undefined
  }

  this.getPadByCode = function (padCode) {
    if (!pads[padCode]) pads[padCode] = new Pad(padCode, self)
    return pads[padCode]
  }

  this.getKnobByCode = function (knobCode) {
    if (!knobs[knobCode]) knobs[knobCode] = { throttleTimeoutHandle: null, knob: new Knob(knobCode, self) }
    return knobs[knobCode]
  }

  this.sendMidi = function (type, args) {
    return output.send(type, args)
  }

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

  function onCc(msg) {
    var knobInfo = knobs[msg.controller]
    if (!!knobInfo) {
      if (knobInfo.throttleTimeoutHandle) clearTimeout(knobInfo.throttleTimeoutHandle)
      knobInfo.throttleTimeoutHandle = setTimeout(() => knobInfo.knob.emit('knob-change', msg.value), 150)
    }
  }
}

exports.LPD8 = function(name = 'LPD8', virtual = false) {
  try {
    return new LPD8(name, virtual)
  } catch (err) {
    console.warn(err);
  }

  return null
}
