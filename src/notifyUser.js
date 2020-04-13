const { Notification } = require('electron');

function notifyUser(subtitle, text, icon) {
  new Notification({
    title: 'MIDI listener',
    body: text,
    subtitle: subtitle,
    icon: icon
  }).show();
}

exports.notifyUser = notifyUser;
