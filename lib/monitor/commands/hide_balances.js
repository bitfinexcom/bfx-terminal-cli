'use strict'

const hideBalancesCommand = (monitor, l) => ({
  matcher: new RegExp(/^hide-balances$/),
  help: {
    command: 'hide-balances',
    description: 'Hide balance figures from screen; useful for screenshots'
  },

  handler: () => {
    monitor.setBalancesVisible(false)
    l('Balances now hidden')
  }
})

module.exports = hideBalancesCommand
