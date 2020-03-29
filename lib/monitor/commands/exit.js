'use strict'

const exitCommand = (monitor, l) => ({
  matcher: new RegExp(/^(exit|close)( *)?(.*)?$/),
  help: {
    command: 'exit',
    description: 'Close the currently open position',
    aliases: ['close']
  },

  handler: async () => {
    const position = monitor.getPosition()

    if (!(position || {}).basePrice) {
      l('No position to close')
      return
    }

    const o = position.orderToClose()

    l('Submitting order: %s', o.toString())

    await monitor.submitOrder(o)

    l('Order submitted')
  }
})

module.exports = exitCommand
