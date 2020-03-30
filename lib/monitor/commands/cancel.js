'use strict'

const colors = require('colors')
const _isEmpty = require('lodash/isEmpty')
const defineCommandYargs = require('../util/define_command_yargs')

const cancelCommand = (monitor, l) => y => defineCommandYargs(y, {
  command: 'cancel [id|all]',
  description: 'Cancel an order by internal ID; Cancels all orders if none specified',
  aliases: ['cc'],

  options: {
    id: {
      type: 'string',
      describe: 'ID of order to cancel, \'all\' to cancel all open orders',
      choices: ['all', ...monitor.getActiveOrderIDs().map(id => `${id}`)]
    }
  },

  handler: async (argv) => {
    const { id, all } = argv
    const allIDs = monitor.getActiveOrderIDs()
    const idsToCancel = (id === 'all' || (!id && !all)) ? allIDs : [+id]

    if (_isEmpty(idsToCancel)) {
      l(colors.red('No orders to cancel'))
      return
    }

    await monitor.cancelOrdersByID(idsToCancel)

    l(
      colors.blue('Canceled %d orders: %s'),
      idsToCancel.length, idsToCancel.join(', ')
    )
  }
})

module.exports = cancelCommand
