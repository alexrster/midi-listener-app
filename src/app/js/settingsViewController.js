const { ipcRenderer } = require('electron');

const editorConfig = {
  mode: 'code',
  modes: ['code', 'form'],
  indentation: 2
};

var editor = {}

ipcRenderer.on('settings-data', function (event, data) {
});

function updateSettings() {
  ipcRenderer.sendSync('settings', 'set', editor.get());
}

function init() {
  var data = ipcRenderer.sendSync('settings', 'get');
  editor = new JSONEditor(document.getElementById('jsoneditor'), editorConfig, data);
}