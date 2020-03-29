'use strict'

const _isFinite = require('lodash/isFinite')

const sizeAlertCommand = (monitor, l) => ({
  matcher: new RegExp(/^set-size-alert\b(.*)$/),
  help: {
    command: 'set-size-alert <size>',
    description: 'Set the minimum trade size alerting threshold'
  },

  handler: (matches) => {
    const [, _size] = matches
    const size = +_size

    if (!_isFinite(size)) {
      throw new Error('Invalid size, not a number')
    }

    if (size <= 0) {
      throw new Error('Size cannot be negative, as alerting is absolute')
    }

    monitor.setTradeSizeAlertThreshold(size)

    l('Trade size alerting threshold set to %f', size)
  }
})

module.exports = sizeAlertCommand
