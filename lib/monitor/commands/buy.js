'use strict'

const _isFinite = require('lodash/isFinite')
const { Order } = require('bfx-api-node-models')

const buyCommand = (monitor, l) => ({
  matcher: new RegExp(/^(b|buy)\b(.*)?$/),
  help: {
    command: 'buy [size]',
    description: 'Execute a MARKET buy; quick order size used by default',
    aliases: ['b']
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
      amount: size
    }))

    l('Buy submitted (in %dms)'.green, Date.now() - start)
  }
})

module.exports = buyCommand
