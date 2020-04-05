'use strict'

const { sprintf } = require('sprintf-js')
const _isFinite = require('lodash/isFinite')
const Plugin = require('./plugin')

const SETTING = 'alerts.group-trade-size'
const DEFAULT_MIN_SIZE_MUL = 100 * 1000

class TradeGroupSizeAlertsPlugin extends Plugin {
  constructor (terminal) {
    super('trade-group-size-alerts', {
      terminal,
      requiredHooks: ['notifyImportant'],
      requiredModules: [
        'plugin:settings',
        'plugin:market-info'
      ],

      providedHooks: [
        'groupSizeAlertThresholdUpdated'
      ],

      hooks: {
        sellTradeGroupUpdate: 'onSellGroupUpdate',
        buyTradeGroupUpdate: 'onBuyGroupUpdate',
        dataMarketInfo: 'onMarketInfo'
      },

      terminalMethods: [
        'getGroupSizeAlertThreshold',
        'setTradeGroupSizeAlertThreshold'
      ]
    })

    this.sellGroupAlerted = false
    this.buyGroupAlerted = false
    this.threshold = 0

    this.getTerminal().defineSetting({
      key: SETTING,
      description: 'Minimum trade group size to alert for',
      validate: v => _isFinite(+v),
      transform: v => +v,
      value: this.threshold
    })

    this.getTerminal().subscribeSetting(SETTING, (value) => {
      this.threshold = value
      this.emit('groupSizeAlertThresholdUpdated', value)
    })
  }

  getGroupSizeAlertThreshold () {
    return this.getTerminal().getSetting(SETTING)
  }

  setTradeGroupSizeAlertThreshold (v) {
    this.getTerminal().setSetting(SETTING, v)
  }

  onMarketInfo (info) {
    const { minTradeSize } = info

    if (this.getGroupSizeAlertThreshold() === 0) {
      this.setTradeGroupSizeAlertThreshold(minTradeSize * DEFAULT_MIN_SIZE_MUL)
    }
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
