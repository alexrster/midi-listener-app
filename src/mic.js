const execa = require('execa')
const { EventEmitter } = require('events')

const DEFAULT_VOLUME = 50;

const eventEmitter = Object.create(EventEmitter.prototype);

let desiredVolume = DEFAULT_VOLUME
let currentVolume

function muteMic() {
  return setVolume(0);
}

function unmuteMic() {
  return setVolume(desiredVolume);
}

function setVolume(val) {
  if (val == currentVolume) return

  var pastVolume = currentVolume
  currentVolume = val
  return osascript('set volume input volume ' + val).then(() => notifyMuteChanged(pastVolume, val));
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
  onMuted: function(listener) { return eventEmitter.on('muted', listener) },
  onUnmuted: function(listener) { return eventEmitter.on('unmuted', listener) }
}