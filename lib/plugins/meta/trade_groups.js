'use strict'

const Plugin = require('../plugin')

/**
 * Provides trade group (consecutive trades in the same direction) tracking
 *
 * @extends Plugin
 */
class TradeGroupsPlugin extends Plugin {
  /**
   * @param {Terminal} terminal - terminal instance
   */
  constructor (terminal) {
    super('meta:trade-groups', {
      terminal,
      requiredModules: [
        'plugin:data:trades'
      ],

      providedHooks: [
        'sellTradeGroupUpdate',
        'buyTradeGroupUpdate'
      ],

      hooks: {
        dataTradeEntry: 'onPublicTrade'
      }
    })

    this.buyGroupSize = 0
    this.buyGroupCount = 0
    this.sellGroupSize = 0
    this.sellGroupCount = 0
    this.lastTradeDirection = 0
  }

  /**
   * Updates current group data and emits update events
   *
   * @emits TradeGroupsPlugin~sellTradeGroupUpdate
   * @emits TradeGroupsPlugin~buyTradeGroupUpdate
   * @listens TradesDataPlugin~dataTradeEntry
   * @private
   * @async
   *
   * @param {object} data - payload
   * @param {Trade} data.trade - trade
   */
  async onPublicTrade ({ trade }) {
    const { amount } = trade

    if (amount < 0) {
      this.buyGroupSize = 0
      this.buyGroupCount = 0
      this.sellGroupSize += amount
      this.sellGroupCount += 1

      /**
       * Fired when the current sell trade group is updated
       *
       * @event TradeGroupsPlugin~sellTradeGroupUpdate
       * @property {number} amount - total group amount
       * @property {number} count - number of trades in group
       */
      return this.emit('sellTradeGroupUpdate', {
        amount: this.sellGroupSize,
        count: this.sellGroupCount
      })
    }

    this.sellGroupSize = 0
    this.sellGroupCount = 0
    this.buyGroupSize += amount
    this.buyGroupCount += 1

    /**
     * Fired when the current buy trade group is updated
     *
     * @event TradeGroupsPlugin~buyTradeGroupUpdate
     * @property {number} amount - total group amount
     * @property {number} count - number of trades in group
     */
    return this.emit('buyTradeGroupUpdate', {
      amount: this.buyGroupSize,
      count: this.buyGroupCount
    })
  }
}

module.exports = TradeGroupsPlugin
