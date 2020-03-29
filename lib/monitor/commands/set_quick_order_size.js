'use strict'

const _isFinite = require('lodash/isFinite')

const setQuickOrderSizeCommand = (monitor, l) => ({
  matcher: new RegExp(/^set-quick-order-size( *)(.*)$/),
  help: {
    command: 'set-quick-order-size <size>',
    description: 'Set the size for quick order execution commands'
  },

  handler: (matches) => {
    const [,, _size] = matches
    const size = +_size

    if (!_isFinite(size)) {
      throw new Error('Invalid size, not a number')
    }

    if (size <= 0) {
      throw new Error('Size cannot be negative; direction set by individual commands')
    }

    monitor.setQuickOrderSize(size)

    l('Set quick order size to %f', size)
  }
})

module.exports = setQuickOrderSizeCommand
