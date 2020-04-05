'use strict'

const Plugin = require('./plugin')

class TradeGroupsPlugin extends Plugin {
  constructor (terminal) {
    super('trade-groups', {
      terminal,
      providedHooks: [
        'sellTradeGroupUpdate',
        'buyTradeGroupUpdate'
      ],

      hooks: {
        wsTradeEntry: 'onPublicTrade'
      }
    })

    this.buyGroupSize = 0
    this.buyGroupCount = 0
    this.sellGroupSize = 0
    this.sellGroupCount = 0
    this.lastTradeDirection = 0
  }

  onPublicTrade ({ trade }) {
    const { amount } = trade

    if (amount < 0) {
      this.buyGroupSize = 0
      this.buyGroupCount = 0
      this.sellGroupSize += amount
      this.sellGroupCount += 1

      this.emit('sellTradeGroupUpdate', {
        amount: this.sellGroupSize,
        count: this.sellGroupCount
      })
    } else {
      this.sellGroupSize = 0
      this.sellGroupCount = 0
      this.buyGroupSize += amount
      this.buyGroupCount += 1

      this.emit('buyTradeGroupUpdate', {
        amount: this.buyGroupSize,
        count: this.buyGroupCount
      })
    }
  }
}

module.exports = TradeGroupsPlugin
