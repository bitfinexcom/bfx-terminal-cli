'use strict'

const _isFinite = require('lodash/isFinite')

const setLeftChartWindowCommand = (monitor, l) => ({
  matcher: new RegExp(/^set-left-chart-window( *)(.*)$/),
  help: {
    command: 'set-left-chart-window <window>',
    description: 'Set the left chart window size'
  },

  handler: (matches) => {
    const [,, _window] = matches
    const window = +_window

    if (!_isFinite(window)) {
      throw new Error('Invalid window, not a number')
    }

    if (window <= 0) {
      throw new Error('Window cannot be negative')
    }

    monitor.setLeftChartWindow(Math.floor(window))

    l('Left chart window set to %d', window)
  }
})

module.exports = setLeftChartWindowCommand
