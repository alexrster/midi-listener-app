const http = require('http')

function ledMatrix(baseUrl) {
  this.marqueeText = function(text) {
    stopBlinking()
    return marqueeText(text)
  }
  
  this.setText = function(text, invert) {
    stopBlinking()
    return setText(text, invert)
  }

  this.clear = function() {
    stopBlinking()
    return setText('')
  }

  var intervalHandle = null
  this.setBlinkingText = function(text, duration = 667) {
    stopBlinking()
    setText(text, true).then(() => {
      intervalHandle = setInterval(ctx => {
        ctx.current = !ctx.current
        setText(text, ctx.current).catch(() => stopBlinking())
      }, duration, { current: true })
    })
  }

  var setText = function(text, invert) {
    return new Promise((resolve, reject) => {
      try {
        resolve(http.get(baseUrl + '/set/?msg=' + encodeURI(text)  + (!!invert ? '&invert=1' : '')))
      } catch (e) {
        reject(e)
      }
    })
  }

  var marqueeText = function(text) {
    return new Promise((resolve, reject) => {
      try {
        resolve(http.get(baseUrl + '/marquee/?msg=' + encodeURI(text)))
      } catch (e) {
        reject(e)
      }
    })    
  }

  var stopBlinking = function() {
    if (!intervalHandle) return

    clearInterval(intervalHandle)
    intervalHandle = null
  }
}

exports.ledMatrix = ledMatrix