'use strict'

const Plugin = require('./plugin')

class TradeSizeAlertsPlugin extends Plugin {
  constructor (terminal, { threshold }) {
    super('trade-size-alerts', {
      terminal,
      hooks: {
        wsTradeEntry: 'onPublicTrade'
      }
    })

    this.threshold = threshold
  }

  genNotification ({ amount, price }) {
    return {
      title: 'Trade Size Alert',
      message: [
        'Saw %s over threshold %f\n%f @ %f',
        amount < 0 ? 'sell' : 'buy', this.threshold, amount, price
      ]
    }
  }

  onPublicTrade ({ trade }) {
    const { amount } = trade

    if (
      (amount < 0 && amount < (-1 * this.threshold)) ||
      (amount > 0 && amount > this.threshold)
    ) {
      this.getTerminal().emit('notifyImportant', this.genNotification(trade))
    }
  }
}

module.exports = TradeSizeAlertsPlugin
