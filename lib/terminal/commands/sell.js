'use strict'

const { Order } = require('bfx-api-node-models')
const defineCommandYargs = require('../util/define_command_yargs')

const sellCommand = (terminal, l) => y => defineCommandYargs(y, {
  command: 'sell [size]',
  description: 'Execute a MARKET sell; quick order size used by default',
  aliases: ['s'],

  options: {
    size: {
      alias: 's',
      type: 'number',
      describe: 'Order size, defaults to quick order size',
      default: terminal.getQuickOrderSize()
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

    await terminal.submitOrder(new Order({
      symbol: terminal.getSymbol(),
      type: Order.type.MARKET,
      amount: -1 * size
    }))

    l('Sell submitted (in %dms)'.red, Date.now() - start)
  }
})

module.exports = sellCommand
