const { Tray } = require('electron')

function TrayIcon(icon) {
  this.set = function (tray) {
    tray.setImage(icon)
  }
}

function TrayBlinkingIcon(...icons) {
  var intervalHandle

  this.set = function (tray, duration = 667) {
    setImage(tray, icons[0])

    intervalHandle = setInterval(ctx => {
      if (++ctx.current >= ctx.count) ctx.current = 0
      setImage(tray, icons[ctx.current])
    }, duration, { current: 0, count: icons.length })

    tray.once('before-image-update', () => {
      clearInterval(intervalHandle)
    })
  }

  var setImage = function (tray, imagePath) {
    traySetImage.call(tray, imagePath)
  }
}

var traySetImage = Tray.prototype.setImage
Tray.prototype.setImage = function(imagePath) {
  this.emit('before-image-update', imagePath)
  traySetImage.call(this, imagePath)
}

Tray.prototype.setIcon = function(icon) {
  icon.set(this)
}

module.exports = {
  TrayIcon: TrayIcon,
  TrayBlinkingIcon: TrayBlinkingIcon
}