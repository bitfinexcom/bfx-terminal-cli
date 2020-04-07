'use strict'

const Plugin = require('../plugin')

require('../../types/order')

/**
 * Propagates account order events
 *
 * @extends Plugin
 */
class OrdersDataPlugin extends Plugin {
  constructor (terminal) {
    super('data:orders', {
      terminal,
      requiredModules: [
        'plugin:ws:connection'
      ],

      providedHooks: [
        'dataOrderSnapshot',
        'dataOrderCreated',
        'dataOrderUpdated',
        'dataOrderClosed'
      ],

      hooks: {
        wsAuthenticated: 'onWSAuthenticated'
      }
    })
  }

  /**
   * Hooks up order event listeners/event emitters
   *
   * @listens WSConnectionPlugin~wsAuthenticated
   * @fires OrdersDataPlugin~dataOrderSnapshot
   * @fires OrdersDataPlugin~dataOrderCreated
   * @fires OrdersDataPlugin~dataOrderUpdated
   * @fires OrdersDataPlugin~dataOrderClosed
   * @private
   *
   * @param {object} data - payload
   * @param {WSv2} data.ws - WSv2 client
   */
  onWSAuthenticated ({ ws }) {
    ws.onOrderSnapshot({}, (snapshot) => {
      /**
       * Sent when an account order snapshot is received (immediately after
       * auth)
       *
       * @event OrdersDataPlugin~dataOrderSnapshot
       * @property {Order[]} snapshot
       */
      this.emitSync('dataOrderSnapshot', { snapshot })
    })

    ws.onOrderNew({}, (order) => {
      /**
       * Sent when an account order is created (may have immediately partially
       * filled)
       *
       * @event OrdersDataPlugin~dataOrderCreated
       * @property {Order} order
       */
      this.emitSync('dataOrderCreated', { order })
    })

    ws.onOrderUpdate({}, (order) => {
      /**
       * Sent when an account order is updated (partial fill or attribute change)
       *
       * @event OrdersDataPlugin~dataOrderUpdated
       * @property {Order} order
       */
      this.emitSync('dataOrderUpdated', { order })
    })

    ws.onOrderClose({}, (order) => {
      /**
       * Sent when an account order is closed (cancelled or executed)
       *
       * @event OrdersDataPlugin~dataOrderClosed
       * @property {Order} order
       */
      this.emitSync('dataOrderClosed', { order })
    })
  }
}

module.exports = OrdersDataPlugin
