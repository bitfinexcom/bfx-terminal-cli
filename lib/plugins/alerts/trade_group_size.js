'use strict'

const { sprintf } = require('sprintf-js')
const _isFinite = require('lodash/isFinite')
const Plugin = require('../plugin')

const SETTING = 'alerts.group-trade-size'
const DEFAULT_MIN_SIZE_MUL = 30 * 1000

/**
 * Monitors trade group events on the terminal's symbol and emits alert events
 * when groups are seen with size greater than the configured threshold. The
 * threshold is made available to other modules as a `alerts.group-trade-size`
 * setting via {@link SettingsPlugin}
 *
 * @fires TradeGroupSizeAlertsPlugin~groupSizeAlertThresholdUpdated
 * @extends Plugin
 */
class TradeGroupSizeAlertsPlugin extends Plugin {
  /**
   * @param {ModuleHost} host - host instance
   */
  constructor (host) {
    super('alerts:trade-group-size', {
      host,
      requiredHooks: ['notifyImportant'],
      requiredModules: [
        'plugin:core:settings',
        'plugin:data:market-info'
      ],

      providedHooks: [
        'groupSizeAlertThresholdUpdated'
      ],

      hooks: {
        sellTradeGroupUpdate: 'onSellGroupUpdate',
        buyTradeGroupUpdate: 'onBuyGroupUpdate',
        dataMarketInfo: 'onMarketInfo'
      },

      hostMethods: [
        'getGroupSizeAlertThreshold',
        'setTradeGroupSizeAlertThreshold'
      ]
    })

    this.sellGroupAlerted = false
    this.buyGroupAlerted = false
    this.threshold = 0

    this.getHost().defineSetting({
      key: SETTING,
      type: 'number',
      description: 'Minimum trade group size to alert for',
      validate: v => _isFinite(+v),
      transform: v => +v,
      value: this.threshold
    })

    this.getHost().subscribeSetting(SETTING, async (value) => {
      this.threshold = value

      /**
       * Fired when the group size alerting threshold is changed
       *
       * @event TradeGroupSizeAlertsPlugin~groupSizeAlertThresholdUpdated
       * @property {number} value - threshold
       */
      return this.emit('groupSizeAlertThresholdUpdated', { value })
    })
  }

  /**
   * Returns the minimum group size alerting threshold; attached as a terminal
   * method.
   *
   * @returns {number} threshold
   */
  getGroupSizeAlertThreshold () {
    return this.getHost().getSetting(SETTING)
  }

  /**
   * Update the minimum group size alerting threshold; attached as a terminal
   * method.
   *
   * @param {number} v - threshold
   */
  setTradeGroupSizeAlertThreshold (v) {
    this.getHost().setSetting(SETTING, v)
  }

  /**
   * Initializes the threshold if set to 0 with the minimum market trade size
   *
   * @listens MarketInfoDataPlugin~dataMarketInfo
   * @private
   *
   * @param {object} data - payload
   * @param {MarketInfo} data.info - market info
   */
  onMarketInfo ({ info }) {
    const { minTradeSize } = info

    if (this.getGroupSizeAlertThreshold() === 0) {
      this.setTradeGroupSizeAlertThreshold(minTradeSize * DEFAULT_MIN_SIZE_MUL)
    }
  }

  /**
   * @private
   * @param {object} data - notification data
   * @param {number} data.amount - group size that triggered notification
   * @param {number} data.price - price for trade
   * @returns {NotificationData} notification
   */
  genNotification ({ amount, count }) {
    return {
      title: 'Group Size Alert',
      message: sprintf(
        '%s group over threshold %f\n%f for %d trades',
        amount < 0 ? 'Sell' : 'Buy', this.threshold, amount, count
      )
    }
  }

  /**
   * @fires NotificationsPlugin~notifyImportant
   * @listens TradeGroupsPlugin~sellTradeGroupUpdate
   * @private
   * @async
   *
   * @param {object} data - payload
   * @param {number} data.amount - total group size
   * @param {number} data.count - number of trades in group
   */
  async onSellGroupUpdate ({ amount, count }) {
    this.buyGroupAlerted = false

    if (!this.sellGroupAlerted && amount < 0 && amount < (-1 * this.threshold)) {
      const notification = this.genNotification({ amount, count })
      this.sellGroupAlerted = true

      return this.emit('notifyImportant', notification)
    }
  }

  /**
   * @fires NotificationsPlugin~notifyImportant
   * @listens TradeGroupsPlugin~buyTradeGroupUpdate
   * @private
   * @async
   *
   * @param {object} data - payload
   * @param {number} data.amount - total group size
   * @param {number} data.count - number of trades in group
   */
  async onBuyGroupUpdate ({ amount, count }) {
    this.sellGroupAlerted = false

    if (!this.buyGroupAlerted && amount > 0 && amount > this.threshold) {
      const notification = this.genNotification({ amount, count })
      this.buyGroupAlerted = true

      return this.emit('notifyImportant', notification)
    }
  }
}

module.exports = TradeGroupSizeAlertsPlugin
