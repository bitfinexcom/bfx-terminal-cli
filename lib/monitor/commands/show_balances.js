
'use strict'

const showBalancesCommand = (monitor, l) => ({
  matcher: new RegExp(/^show-balances$/),
  help: {
    command: 'show-balances',
    description: 'Show balance figures on screen'
  },

  handler: () => {
    monitor.setBalancesVisible(true)
    l('Balances now visible')
  }
})

module.exports = showBalancesCommand
