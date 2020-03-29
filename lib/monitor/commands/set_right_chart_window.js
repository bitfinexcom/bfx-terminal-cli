'use strict'

const _isFinite = require('lodash/isFinite')

const setRightChartWindow = (monitor, l) => ({
  matcher: new RegExp(/^set-right-chart-window\b(.*)$/),
  help: {
    command: 'set-right-chart-window <window>',
    description: 'Set the right chart window size'
  },

  handler: (matches) => {
    const [, _window] = matches
    const window = +_window

    if (!_isFinite(window)) {
      throw new Error('Invalid window, not a number')
    }

    if (window <= 0) {
      throw new Error('Window cannot be negative')
    }

    monitor.setRightChartWindow(Math.floor(window))

    l('Right chart window set to %d', window)
  }
})

module.exports = setRightChartWindow
