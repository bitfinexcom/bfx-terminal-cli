'use strict'

const _isFinite = require('lodash/isFinite')
const { Order } = require('bfx-api-node-models')

const sellCommand = (monitor, l) => ({
  matcher: new RegExp(/^sell( *)?(.*)?$/),
  help: {
    command: 'sell [size]',
    description: 'Execute a MARKET sell; quick order size used by default'
  },

  handler: async (matches) => {
    const [,, _specifiedSize] = matches
    const specifiedSize = +_specifiedSize
    let size = monitor.getQuickOrderSize()

    if (_isFinite(specifiedSize)) {
      if (specifiedSize < 0) {
        throw new Error('Size must be positive')
      }

      size = specifiedSize
    }

    const o = new Order({
      symbol: monitor.getSymbol(),
      type: Order.type.MARKET,
      amount: -1 * size
    })

    l('Submitting order: %s', o.toString())

    await monitor.submitOrder(o)

    l('Order submitted')
  }
})

module.exports = sellCommand
