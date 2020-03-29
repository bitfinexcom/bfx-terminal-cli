'use strict'

const _isFinite = require('lodash/isFinite')

const setEMAPeriodCommand = (monitor, l) => ({
  matcher: new RegExp(/^set-ema-period( *)(.*)$/),
  help: {
    command: 'set-ema-period <period>',
    description: 'Set the chart EMA indicator period'
  },

  handler: (matches) => {
    const [,, _period] = matches
    const period = +_period

    if (!_isFinite(period)) {
      throw new Error('Invalid period, not a number')
    }

    if (period <= 0) {
      throw new Error('EMA period cannot be negative')
    }

    monitor.setEMAPeriod(Math.floor(period))

    l('Chart EMA period set to %d', period)
  }
})

module.exports = setEMAPeriodCommand
