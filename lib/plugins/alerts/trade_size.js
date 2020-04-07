'use strict'

const _isFinite = require('lodash/isFinite')
const Plugin = require('../plugin')

require('../../types/market_info')
require('../../types/notification_data')

const SETTING = 'alerts.trade-size'
const DEFAULT_MIN_SIZE_MUL = 1000

/**
 * Monitors trade events on the terminal's symbol and emits alert events when
 * trades are seen with size greater than the configured threshold. The
 * threshold is made available to other modules as a `alerts.trade-size`
 * setting via {@link SettingsPlugin}
 *
 * @fires TradeSizeAlertsPlugin~tradeSizeAlertThresholdUpdatede
 *
 * @extends Plugin
 */
class TradeSizeAlertsPlugin extends Plugin {
  /**
   * @param {ModuleHost} host - host instance
   */
  constructor (host) {
    super('alerts:trade-size', {
      host,
      requiredModules: [
        'plugin:core:settings',
        'plugin:data:market-info',
        'plugin:data:trades'
      ],

      providedHooks: [
        'tradeSizeAlertThresholdUpdated'
      ],

      hooks: {
        dataTradeEntry: 'onPublicTrade',
        dataMarketInfo: 'onMarketInfo'
      },

      hostMethods: [
        'getTradeSizeAlertThreshold',
        'setTradeSizeAlertThreshold'
      ]
    })

    this.threshold = 0

    this.getHost().defineSetting({
      key: SETTING,
      type: 'number',
      description: 'Minimum trade size to alert for',
      validate: v => _isFinite(+v),
      transform: v => +v,
      value: this.threshold
    })

    this.getHost().subscribeSetting(SETTING, async (value) => {
      this.threshold = value

      /**
       * Fired when the trade size alerting threshold is changed
       *
       * @event TradeSizeAlertsPlugin~tradeSizeAlertThresholdUpdated
       * @property {number} value - threshold
       */
      return this.emit('tradeSizeAlertThresholdUpdated', { value })
    })
  }

  /**
   * Returns the minimum trade size alerting threshold; host method
   *
   * @alias ModuleHost.getTradeSizeAlertThreshold
   *
   * @returns {number} threshold
   */
  getTradeSizeAlertThreshold () {
    return this.getHost().getSetting(SETTING)
  }

  /**
   * Update the minimum trade size alerting threshold; host method
   * method.
   *
   * @alias ModuleHost.setTradeSizeAlertThreshold
   *
   * @param {number} v - threshold
   */
  setTradeSizeAlertThreshold (v) {
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

    if (this.getTradeSizeAlertThreshold() === 0) {
      this.setTradeSizeAlertThreshold(minTradeSize * DEFAULT_MIN_SIZE_MUL)
    }
  }

  /**
   * @private
   * @param {object} data - notification data
   * @param {number} data.amount - trade size that triggered notification
   * @param {number} data.price - price for trade
   * @returns {NotificationData} notification
   */
  genNotification ({ amount, price }) {
    return {
      title: 'Trade Size Alert',
      message: [
        'Saw %s over threshold %f\n%f @ %f',
        amount < 0 ? 'sell' : 'buy', this.threshold, amount, price
      ]
    }
  }

  /**
   * Generates a notification if the trade size is over the configured threshold
   *
   * @listens TradesDataPlugin~wsTradeEntry
   * @fires NotificationsPlugin~notifyImportant
   * @private
   * @async
   *
   * @param {object} data - payload
   * @param {Trade} data.trade - trade
   */
  async onPublicTrade ({ trade }) {
    const { amount } = trade

    if (
      (amount < 0 && amount < (-1 * this.threshold)) ||
      (amount > 0 && amount > this.threshold)
    ) {
      return this.emit('notifyImportant', this.genNotification(trade))
    }
  }
}

module.exports = TradeSizeAlertsPlugin
