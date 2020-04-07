'use strict'

const Plugin = require('../plugin')

require('../../types/trade')
require('../../types/account_trade')

/**
 * Subscribes to the public trades channel for the terminal's symbol and
 * propagates both public and account trade events.
 *
 * @extends Plugin
 */
class TradesDataPlugin extends Plugin {
  /**
   * @param {ModuleHost} host - host instance
   */
  constructor (host) {
    super('data:trades', {
      host,
      requiredModules: [
        'plugin:ws:connection'
      ],

      providedHooks: [
        'dataAccountTradeUpdate',
        'dataAccountTradeEntry',
        'dataTradeEntry'
      ],

      hooks: {
        wsOpened: 'onWSOpened',
        wsAuthenticated: 'onWSAuthenticated'
      }
    })
  }

  /**
   * Hooks up trade listener and event emitter, and subscribes to the trade
   * channel for the terminal's active symbol
   *
   * @fires TradesDataPlugin~dataTradeEntry
   * @private
   *
   * @param {object} data - payload
   * @param {WSv2} data.ws - WSv2 client
   */
  async onWSOpened ({ ws }) {
    const symbol = this.getSymbol()

    ws.onTradeEntry({ symbol }, (trade) => {
      /**
       * Fired when a `te` trade event is received
       *
       * @event TradesDataPlugin~dataTradeEntry
       * @property {string} symbol - trade symbol
       * @property {Trade} trade - trade
       */
      this.emitSync('dataTradeEntry', { symbol, trade })
    })

    return ws.subscribeTrades(symbol)
  }

  /**
   * Hooks up listeners and emitters for account trades
   *
   * @fires TradesDataPlugin~dataAccountTradeEntry
   * @fires TradesDataPlugin~dataAccountTradeUpdate
   * @private
   *
   * @param {object} data - payload
   * @param {WSv2} data.ws - WSv2 client
   */
  onWSAuthenticated ({ ws }) {
    ws.onAccountTradeEntry({}, (trade) => {
      /**
       * Fires when an account trade `te` even is received
       *
       * @event TradesDataPlugin~dataAccountTradeEntry
       * @property {AccountTrade} trade - trade
       */
      this.emitSync('dataAccountTradeEntry', { trade })
    })

    ws.onAccountTradeUpdate({}, (trade) => {
      /**
       * Fires when an account trade `tu` even is received
       *
       * @event TradesDataPlugin~dataAccountTradeUpdate
       * @property {AccountTrade} trade - trade
       */
      this.emitSync('dataAccountTradeUpdate', { trade })
    })
  }
}

module.exports = TradesDataPlugin
