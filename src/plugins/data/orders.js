'use strict'

const _isFinite = require('lodash/isFinite')
const Plugin = require('../plugin')
const genClientID = require('../../util/gen_client_id')

require('../../types/order')

const SETTING = 'orders.quick-size'

/**
 * Propagates account order events
 *
 * @extends Plugin
 */
class OrdersDataPlugin extends Plugin {
  /**
   * @param {ModuleHost} host - host instance
   */
  constructor (host) {
    super('data:orders', {
      host,
      requiredModules: [
        'plugin:ws:connection',
        'plugin:core:settings',
        'plugin:core:notifications',
        'plugin:data:market-info'
      ],

      providedHooks: [
        'dataOrderSnapshot',
        'dataOrderCreated',
        'dataOrderUpdated',
        'dataOrderClosed',

        'quickOrderSizeUpdated'
      ],

      hooks: {
        wsAuthenticated: 'onWSAuthenticated',
        dataMarketInfo: 'onMarketInfo'
      },

      hostMethods: [
        'getQuickOrderSize'
      ],

      asyncHostMethods: [
        'setQuickOrderSize',
        'submitOrder'
      ]
    })

    this.gid = genClientID() // shared between all orders
    this.quickOrderSize = 0 // set in dataMarketInfo event

    this.getHost().defineSetting({
      key: SETTING,
      type: 'number',
      description: 'Quick order size used as default for order methods',
      validate: v => _isFinite(+v),
      transform: v => +v,
      value: this.quickOrderSize
    })

    this.getHost().subscribeSetting(SETTING, async (value) => {
      this.quickOrderSize = value

      /**
       * Fired when the quick order size is changed
       *
       * @event OrdersDataPlugin~quickOrderSizeUpdated
       * @property {number} value - size
       */
      return this.emit('quickOrderSizeUpdated', { value })
    })
  }

  /**
   * Get the quick order size; host method
   *
   * @alias ModuleHost.getQuickOrderSize
   *
   * @returns {number} size
   */
  getQuickOrderSize () {
    return this.getHost().getSetting(SETTING)
  }

  /**
   * Update the quick order size; host method
   *
   * @alias ModuleHost.setQuickOrderSize
   *
   * @param {number} v - threshold
   */
  async setQuickOrderSize (v) {
    return this.getHost().setSetting(SETTING, v)
  }

  /**
   * Defaults quick order size to min trade size
   *
   * @listens MarketInfoDataPlugin~dataMarketInfo
   * @private
   *
   * @param {object} data - payload
   * @param {MarketInfo} data.info - market info
   */
  async onMarketInfo ({ info }) {
    return this.setQuickOrderSize(info.minTradeSize)
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
       * @property {Order[]} snapshot - order snapshot
       */
      this.emitSync('dataOrderSnapshot', { snapshot })
    })

    ws.onOrderNew({}, (order) => {
      /**
       * Sent when an account order is created (may have immediately partially
       * filled)
       *
       * @event OrdersDataPlugin~dataOrderCreated
       * @property {Order} order - order
       */
      this.emitSync('dataOrderCreated', { order })
    })

    ws.onOrderUpdate({}, (order) => {
      /**
       * Sent when an account order is updated (partial fill or attribute change)
       *
       * @event OrdersDataPlugin~dataOrderUpdated
       * @property {Order} order - order
       */
      this.emitSync('dataOrderUpdated', { order })
    })

    ws.onOrderClose({}, (order) => {
      /**
       * Sent when an account order is closed (cancelled or executed)
       *
       * @event OrdersDataPlugin~dataOrderClosed
       * @property {Order} order - order
       */
      this.emitSync('dataOrderClosed', { order })
    })
  }

  /**
   * Submits an order via the WSv2 client and logs/notifies on success,
   * including information on duration of submit operation. The order is given
   * a `cid` and `gid` if not already present.
   *
   * @throws {Error} fails if WSv2 client not open
   * @alias ModuleHost#submitOrder
   * @async
   *
   * @param {Order} o - order
   * @returns {Promise} p
   */
  async submitOrder (o) {
    if (!o.cid) o.cid = genClientID()
    if (!o.gid) o.gid = this.gid

    if (!this.getWS().isOpen()) {
      throw new Error('WSv2 client not open')
    }

    return (this.logDuration(`submitting order: ${o.toString()}`)(async () => {
      return this.getWS().submitOrder(o)
    }, async (duration) => {
      this.logOutput('Order Submitted (%s)', duration)
      this.getHost().notifySuccess({
        title: ['Order Submitted (%s)', duration],
        message: o.toString()
      })
    }))
  }
}

module.exports = OrdersDataPlugin
