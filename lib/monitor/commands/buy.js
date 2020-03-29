'use strict'

const { Order } = require('bfx-api-node-models')
const defineCommandYargs = require('../util/define_command_yargs')

const buyCommand = (monitor, l) => y => defineCommandYargs(y, {
  command: 'buy [size]',
  description: 'Execute a MARKET buy; quick order size used by default',
  aliases: ['b'],

  options: {
    size: {
      alias: 's',
      type: 'number',
      describe: 'Order size, defaults to quick order size',
      default: monitor.getQuickOrderSize()
    }
  },

  extra: {
    check: (argv) => {
      const { size } = argv

      if (size < 0) {
        throw new Error('Size must be positive')
      }
    }
  },

  handler: async (argv) => {
    const { size } = argv
    const start = Date.now()

    await monitor.submitOrder(new Order({
      symbol: monitor.getSymbol(),
      type: Order.type.MARKET,
      amount: size
    }))

    l('Buy submitted (in %dms)'.green, Date.now() - start)
  }
})

module.exports = buyCommand
