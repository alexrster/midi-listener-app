const path = require('path')
const { app, BrowserWindow, Tray, systemPreferences } = require('electron')

function createWindow() {
  // Create the browser window.
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })

  // and load the index.html of the app.
  win.loadFile('index.html')
}

app.whenReady().then(createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

let tray = null
app.on('ready', () => {
  const iconMicPath = path.join(__dirname, 'images', 'mic_11x16.png')
  const iconMicMutedPath = path.join(__dirname, 'images', 'mic-muted_16x16.png')
  tray = new Tray(iconMicPath)

  tray.setToolTip('MIDI listener')
//  tray.setContextMenu(contextMenu)

  tray.on("click", () => {
    tray.setImage(iconMicMutedPath)
  })
})

// app.on('ready', async () => {
//   let value = await systemPreferences.askForMediaAccess("microphone")
//   console.log(value ? "ALLOWED" : "DENIED")
// })
const execa = require('execa')
const easymidi = require('easymidi');
const input = new easymidi.Input('LPD8');
const output = new easymidi.Output('LPD8');

const PAD_MUTE = 48;

const DEFAULT_VOLUME = 50;
var volume = 0;

function start() {
  input.on('noteon', onNoteOn);
  input.on('noteoff', onNoteOff);
}

// msg: { channel: 0, note: 44, velocity: 50, _type: 'noteon' }
function onNoteOn(msg) {
  //console.log(msg);

  switch(msg.note) {
    case PAD_MUTE: muteMic().then(_ => notifyUser("Mic is MUTED", 'Handle MIDI command')); break;
  }
}

function onNoteOff(msg) {
  switch(msg.note) {
    case PAD_MUTE: unmuteMic().then(_ => notifyUser("Mic is UNMUTED", 'Handle MIDI command')); break;
  }
}

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

function notifyUser(subtitle, text) {
  return osascript('display notification "' + text + '" with title "MIDI listener app"' + (!!subtitle ? ' subtitle "' + subtitle + '"' : ''));
}

function osascript(cmd) {
  return execa('osascript', ['-e', cmd]).then(result => result.stdout);
}

app.on('ready', async () => {
  let vol = await getVolume()
  if (!(vol>=0)) throw Error("Can't get volume settings!");
  
  volume = vol;
  
  if (volume > 0) output.send('noteoff', { note: PAD_MUTE, channel: 0, velocity: 127 });
  else output.send('noteon', { note: PAD_MUTE, channel: 0, velocity: 127 });
  
  start();
  
  notifyUser('Mic is ' + (volume > 0? 'UN' : '') + 'MUTED', 'Just started');
})