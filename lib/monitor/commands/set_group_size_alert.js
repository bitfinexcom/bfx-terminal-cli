'use strict'

const _isFinite = require('lodash/isFinite')

const groupSizeAlertCommand = (monitor, l) => ({
  matcher: new RegExp(/^set-group-size-alert\b(.*)$/),
  help: {
    command: 'set-group-size-alert <size>',
    description: 'Set the minimum trade group size alerting threshold'
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

    monitor.setTradeGroupSizeAlertThreshold(size)

    l('Trade group size alerting threshold set to %f', size)
  }
})

module.exports = groupSizeAlertCommand
