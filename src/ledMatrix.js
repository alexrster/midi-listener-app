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
    return new Promise((r, _) => r())
  }

  var intervalHandle = null
  this.setBlinkingText = function(text, duration = 600) {
    stopBlinking()
    setText(text, true, duration).then(() => {
      intervalHandle = setInterval(ctx => {
        ctx.current = !ctx.current
        setText(text, ctx.current, duration).catch(() => stopBlinking())
      }, duration, { current: true, duration: duration })
    })
  }

  var setText = function(text, invert, duration) {
    return new Promise((resolve, reject) => {
      try {
        resolve(http.get(baseUrl + '/set/?msg=' + encodeURI(text)  + (!!invert ? '&invert=1' : '') + (!!duration ? '&duration=' + duration : '')))
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

    clearText()
  }

  var clearText = function() {
    return new Promise((resolve, reject) => {
      try {
        resolve(http.get(baseUrl + '/clear/'))
      } catch (e) {
        reject(e)
      }
    })    
  }
}

exports.ledMatrix = ledMatrix