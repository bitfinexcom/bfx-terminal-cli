'use strict'

const colors = require('colors')
const defineCommandYargs = require('../util/define_command_yargs')

const bidCommand = (monitor, l) => y => defineCommandYargs(y, {
  command: 'bid [size]',
  description: [
    'Submit a LIMIT order one tick above the best bid, and update it to stay',
    'at the front of the book'
  ].join(' '),

  aliases: ['lb', 'lbuy'],

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

      return true
    }
  },

  handler: async (argv) => {
    const { size } = argv

    try {
      await monitor.setupSmartBookOrder(size || monitor.getQuickOrderSize())
      l(colors.blue('Smart bid created'))
    } catch (_) {
      l(colors.red('A smart book order is already active'))
    }
  }
})

module.exports = bidCommand
