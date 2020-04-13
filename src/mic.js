const execa = require('execa')

const DEFAULT_VOLUME = 50;

let volume = 0;

function muteMic() {
  return getVolume().then(vol => { 
    volume = vol;
    return setVolume(0);
  });
}

function unmuteMic() {
  return setVolume(volume > 0 ? volume : DEFAULT_VOLUME);
}

function setVolume(val) {
  return osascript('set volume input volume ' + val);
}

function getVolume() {
  return osascript('input volume of (get volume settings)').then(vol => parseInt(vol));
}

function osascript(cmd) {
  return execa('osascript', ['-e', cmd]).then(result => result.stdout);
}

getVolume().then(vol => { 
  if (!(vol>=0)) throw Error("Can't get volume settings!") 
  volume = vol;
});

exports.mic = {
  mute: muteMic,
  unmute: unmuteMic,
  getVolume: getVolume
}
