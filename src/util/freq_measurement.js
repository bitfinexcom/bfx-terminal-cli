'use strict'

const _isEmpty = require('lodash/isEmpty')

class FrequencyMeasurement {
  constructor (interval, lookback) {
    this.buffer = []
    this.interval = interval
    this.lookback = lookback
  }

  add () {
    this.trimBuffer()
    this.buffer.push(Date.now())
  }

  reset () {
    this.buffer = []
  }

  f () {
    this.trimBuffer()

    if (_isEmpty(this.buffer)) {
      return 0
    }

    let end = Date.now()
    let windowCount = 0

    for (let i = 0; i < this.buffer.length; i += 1) {
      if (end - this.buffer[i] > this.interval || i === this.buffer.length - 1) {
        windowCount += 1
        end = this.buffer[i]
      }
    }

    return this.buffer.length / windowCount
  }

  trimBuffer () {
    const now = Date.now()
    this.buffer = this.buffer.filter(p => (now - p) <= (this.interval * this.lookback))
  }
}

module.exports = FrequencyMeasurement
