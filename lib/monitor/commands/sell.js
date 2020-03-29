'use strict'

const _isFinite = require('lodash/isFinite')
const { Order } = require('bfx-api-node-models')

const sellCommand = (monitor, l) => ({
  matcher: new RegExp(/^(s|sell)\b(.*)?$/),
  help: {
    command: 'sell [size]',
    description: 'Execute a MARKET sell; quick order size used by default',
    aliases: ['s']
  },

  handler: async (matches) => {
    const start = Date.now()
    const [, _specifiedSize] = matches
    const specifiedSize = +_specifiedSize
    let size = monitor.getQuickOrderSize()

    if (_isFinite(specifiedSize)) {
      if (specifiedSize < 0) {
        throw new Error('Size must be positive')
      }

      size = specifiedSize
    }

    await monitor.submitOrder(new Order({
      symbol: monitor.getSymbol(),
      type: Order.type.MARKET,
      amount: -1 * size
    }))

    l('Sell submitted (in %dms)'.red, Date.now() - start)
  }
})

module.exports = sellCommand
