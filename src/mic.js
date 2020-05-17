const execa = require('execa')
const { EventEmitter } = require('events')

const DEFAULT_VOLUME = 50;

const eventEmitter = Object.create(EventEmitter.prototype);

let desiredVolume = DEFAULT_VOLUME
let currentVolume

function muteMic() {
  return setVolume(0, false);
}

function unmuteMic() {
  return setVolume(desiredVolume, false);
}

function setVolume(val, notify = true) {
  if (val == currentVolume) return new Promise(r => r())

  var pastVolume = currentVolume
  currentVolume = val
  return osascript('set volume input volume ' + val)
    .then(() => notifyMuteChanged(pastVolume, val))
    .then(() => { if (notify) eventEmitter.emit('volume-changed', val) });
}

function notifyMuteChanged(pastVolume, val) {
  if (val != 0 && pastVolume == 0) eventEmitter.emit('unmuted')
  else if (val == 0) eventEmitter.emit('muted')
}

function setDesiredVolume(val) {
  desiredVolume = val
  if (currentVolume > 0) setVolume(desiredVolume)
}

function getVolume() {
  return osascript('input volume of (get volume settings)').then(vol => parseInt(vol));
}

function isMuted() {
  return currentVolume == 0
}

function osascript(cmd) {
  return execa('osascript', ['-e', cmd]).then(result => result.stdout);
}

getVolume().then(vol => { 
  if (!(vol>=0)) throw Error("Can't get volume settings!") 
  currentVolume = vol
  desiredVolume = vol > 0 ? vol : DEFAULT_VOLUME

  notifyMuteChanged(undefined, currentVolume)
});

exports.mic = {
  mute: muteMic,
  unmute: unmuteMic,
  isMuted: isMuted,
  setDesiredVolume: setDesiredVolume,
  getVolume: function() { return currentVolume },
  onMuted: function(listener) { return eventEmitter.on('muted', listener) },
  onUnmuted: function(listener) { return eventEmitter.on('unmuted', listener) },
  onVolumeChanged: function(listener) { return eventEmitter.on('volume-changed', listener) }
}