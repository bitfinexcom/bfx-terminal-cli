'use strict'

const exitCommand = (monitor, l) => ({
  matcher: new RegExp(/^(e|exit|c|close)$/),
  help: {
    command: 'exit',
    description: 'Close the currently open position',
    aliases: ['close', 'c', 'e']
  },

  handler: async () => {
    const start = Date.now()
    const position = monitor.getPosition()

    if (!(position || {}).basePrice) {
      l('No position to close')
      return
    }

    await monitor.submitOrder(position.orderToClose())

    l('Position closed (in %dms)'.blue, Date.now() - start)
  }
})

module.exports = exitCommand
