'use strict'

const _isFinite = require('lodash/isFinite')
const Plugin = require('./plugin')

const SETTING = 'alerts.trade-size'
const DEFAULT_MIN_SIZE_MUL = 1000

class TradeSizeAlertsPlugin extends Plugin {
  constructor (terminal) {
    super('trade-size-alerts', {
      terminal,
      requiredModules: [
        'plugin:settings',
        'plugin:market-info'
      ],

      providedHooks: [
        'tradeSizeAlertThresholdUpdated'
      ],

      hooks: {
        wsTradeEntry: 'onPublicTrade',
        dataMarketInfo: 'onMarketInfo'
      },

      terminalMethods: [
        'getTradeSizeAlertThreshold',
        'setTradeSizeAlertThreshold'
      ]
    })

    this.threshold = 0

    this.getTerminal().defineSetting({
      key: SETTING,
      description: 'Minimum trade size to alert for',
      validate: v => _isFinite(+v),
      transform: v => +v,
      value: this.threshold
    })

    this.getTerminal().subscribeSetting(SETTING, (value) => {
      this.threshold = value
      this.emit('tradeSizeAlertThresholdUpdated', value)
    })
  }

  getTradeSizeAlertThreshold () {
    return this.getTerminal().getSetting(SETTING)
  }

  setTradeSizeAlertThreshold (v) {
    this.getTerminal().setSetting(SETTING, v)
  }

  onMarketInfo (info) {
    const { minTradeSize } = info

    if (this.getTradeSizeAlertThreshold() === 0) {
      this.setTradeSizeAlertThreshold(minTradeSize * DEFAULT_MIN_SIZE_MUL)
    }
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
      this.emit('notifyImportant', this.genNotification(trade))
    }
  }
}

module.exports = TradeSizeAlertsPlugin
