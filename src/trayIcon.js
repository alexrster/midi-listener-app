function TrayIcon(icon) {
  var self = this

  this.set = function (tray) {
    if (!!tray.icon) {
      if (tray.icon === self) return;
      else tray.icon.unset()
    }

    tray.icon = self
    tray.setImage(icon)
  }

  this.unset = function() { }
}

function TrayBlinkingIcon(...icons) {
  var self = this
  var intervalHandle

  var setImage = function (tray, imagePath) {
    tray.setImage(imagePath)
  }

  this.set = function (tray, duration = 600) {
    if (!!tray.icon) {
      if (tray.icon === self) return;
      else tray.icon.unset()
    }

    tray.icon = self
    tray.setImage(icons[0])

    intervalHandle = setInterval(ctx => {
      if (++ctx.current >= ctx.count) ctx.current = 0
      setImage(tray, icons[ctx.current])
    }, duration, { current: 0, count: icons.length })
  }

  this.unset = function() { 
    clearInterval(intervalHandle)
  }
}

module.exports = {
  TrayIcon: TrayIcon,
  TrayBlinkingIcon: TrayBlinkingIcon
}