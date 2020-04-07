'use strict'

const Plugin = require('../plugin')

require('../../types/order_book')

/**
 * Subscribes to and propagates public order book events
 */
class OrderBooksDataPlugin extends Plugin {
  /**
   * @param {Terminal} terminal - terminal instance
   */
  constructor (terminal) {
    super('data:order-books', {
      terminal,
      requiredModules: [
        'plugin:ws:connection'
      ],

      providedHooks: [
        'dataOrderBook'
      ],

      hooks: {
        wsOpened: 'onWSOpened'
      }
    })
  }

  /**
   * Subscribes to and binds event listeners/emitters for order book data on
   * the active terminal channel
   *
   * @listens WSConnectionPlugin~wsOpened
   * @fires OrderBooksDataPlugin~dataOrderBook
   * @private
   *
   * @param {object} data - payload
   * @param {WSv2} data.ws - WSv2 client
   */
  async onWSOpened ({ ws }) {
    const symbol = this.getSymbol()

    ws.onOrderBook({ symbol }, (orderBook) => {
      /**
       * Fired when an order book update is received; provides the full managed
       * order book object
       *
       * @event OrderBooksDataPlugin~dataOrderBook
       * @property {OrderBook} orderBook
       */
      this.emitSync('dataOrderBook', { orderBook })
    })

    return ws.subscribeOrderBook(symbol, 'P0', '25')
  }
}

module.exports = OrderBooksDataPlugin
