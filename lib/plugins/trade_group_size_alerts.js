'use strict'

const { sprintf } = require('sprintf-js')
const Plugin = require('./plugin')

class TradeGroupSizeAlertsPlugin extends Plugin {
  constructor (terminal, { threshold }) {
    super('trade-group-size-alerts', {
      terminal,
      requiredHooks: ['notifyImportant'],
      hooks: {
        sellTradeGroupUpdate: 'onSellGroupUpdate',
        buyTradeGroupUpdate: 'onBuyGroupUpdate'
      }
    })

    this.threshold = threshold
    this.sellGroupAlerted = false
    this.buyGroupAlerted = false
  }

  genNotification ({ amount, count }) {
    return {
      title: 'Group Size Alert',
      message: sprintf(
        '%s group over threshold %f\n%f for %d trades',
        amount < 0 ? 'Sell' : 'Buy', this.threshold, amount, count
      )
    }
  }

  onSellGroupUpdate ({ amount, count }) {
    this.buyGroupAlerted = false

    if (!this.sellGroupAlerted && amount < 0 && amount < (-1 * this.threshold)) {
      const notification = this.genNotification({ amount, count })

      this.emit('notifyImportant', notification)
      this.sellGroupAlerted = true
    }
  }

  onBuyGroupUpdate ({ amount, count }) {
    this.sellGroupAlerted = false

    if (!this.buyGroupAlerted && amount > 0 && amount > this.threshold) {
      const notification = this.genNotification({ amount, count })

      this.emit('notifyImportant', notification)
      this.buyGroupAlerted = true
    }
  }
}

module.exports = TradeGroupSizeAlertsPlugin
