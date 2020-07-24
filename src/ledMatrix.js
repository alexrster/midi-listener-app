const http = require('http')

function ledMatrix(baseUrl) {
  this.setText = function(text, invert, duration) {
    return new Promise((resolve, reject) => {
      try {
        resolve(http.get(baseUrl + '/set/?msg=' + encodeURI(text)  + (!!invert ? '&invert=1' : '') + (!!duration ? '&duration=' + duration : '')))
      } catch (e) {
        reject(e)
      }
    })
  }

  this.clear = function() {
    return new Promise((resolve, reject) => {
      try {
        resolve(http.get(baseUrl + '/clear/'))
      } catch (e) {
        reject(e)
      }
    })
  }

  this.setBlinkingText = function(text, duration = 600) {
    return new Promise((resolve, reject) => {
      try {
        resolve(http.get(baseUrl + '/blink/?msg=' + encodeURI(text) + (!!duration ? '&duration=' + duration : '')))
      } catch (e) {
        reject(e)
      }
    })
  }

  this.marqueeText = function(text) {
    return new Promise((resolve, reject) => {
      try {
        resolve(http.get(baseUrl + '/marquee/?msg=' + encodeURI(text) + '&proportional=1'))
      } catch (e) {
        reject(e)
      }
    })    
  }
}

exports.ledMatrix = ledMatrix