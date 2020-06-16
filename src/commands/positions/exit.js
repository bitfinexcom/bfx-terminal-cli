'use strict'

const defineCommandYargs = require('../util/define_command_yargs')

const exitCommand = (terminal, l) => y => defineCommandYargs(y, {
  command: 'exit',
  description: 'Close the currently open position',
  aliases: ['close', 'c', 'e'],
  epilogue: 'Does nothing if no position is open',

  handler: async () => {
    const start = Date.now()
    const position = terminal.getPosition()

    if (!(position || {}).basePrice) {
      l('No position to close')
      return
    }

    await terminal.submitOrder(position.orderToClose())

    l('Position closed (in %dms)'.blue, Date.now() - start)
  }
})

module.exports = exitCommand
