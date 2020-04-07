'use strict'

const colors = require('colors')
const blessed = require('blessed')
const _isFinite = require('lodash/isFinite')
const { preparePrice, prepareAmount } = require('bfx-api-node-util')
const Widget = require('./widget')

const BALANCES_VISIBLE_SETTING = 'status.balances-visible'
const CENSOR_STR = 'HIDDEN'

class StatusWidget extends Widget {
  constructor (host, { geo }) {
    super('status', {
      geo,
      host,
      providesHooks: [
        'balancesVisibleUpdated'
      ],
      requiredModules: [
        'plugin:core:settings',
        'plugin:data:trades',
        'plugin:data:orders',
        'plugin:data:margin-info',
        'plugin:data:market-info',
        'plugin:alerts:trade-size',
        'plugin:alerts:trade-group-size'
      ],

      unique: true,
      element: blessed.box,
      elementOptions: {
        label: 'Status',
        style: { border: { fg: 'gray' } }
      },

      hooks: {
        dataTradeEntry: 'onPublicTrade',
        dataMarketInfo: 'onMarketInfo',
        dataMarginInfo: 'onMarginInfo',
        hostBoot: 'onGenericUpdate',
        tradeSizeAlertThresholdUpdated: 'onGenericUpdate',
        groupSizeAlertThresholdUpdated: 'onGenericUpdate',
        quickOrderSizeUpdated: 'onGenericUpdate'
      }
    })

    this.balancesVisible = true
    this.lastTradePrice = null
    this.marketInfo = this.getHost().getMarketInfo()
    this.marginInfo = this.getHost().getMarginInfo()

    this.getHost().defineSetting({
      key: BALANCES_VISIBLE_SETTING,
      description: 'Toggles display of balances in status widget',
      type: 'number',
      choices: [0, 1],
      value: 1
    })

    this.getHost().subscribeSetting(BALANCES_VISIBLE_SETTING, async (v) => {
      const value = v === 1

      this.balancesVisible = value
      this.onGenericUpdate()

      return this.emit('balancesVisibleUpdated', { value })
    })
  }

  onPublicTrade ({ trade }) {
    this.lastTradePrice = trade.price
    this.update()
  }

  onMarginInfo ({ info }) {
    this.marginInfo = info
    this.update()
  }

  onMarketInfo ({ info }) {
    this.marketInfo = info
    this.update()
  }

  onGenericUpdate () {
    this.update()
  }

  update () {
    const lastPrice = _isFinite(this.lastTradePrice)
      ? preparePrice(this.lastTradePrice)
      : '-'

    const pl = this.marginInfo && _isFinite(this.marginInfo.userPL)
      ? prepareAmount(this.marginInfo.userPL)
      : '-'

    const plCL = !_isFinite(+pl)
      ? colors.cyan
      : +pl === 0
        ? colors.cyan
        : +pl > 0
          ? colors.bgGreen.black
          : colors.bgRed.black

    const marginBalance = this.marginInfo && _isFinite(this.marginInfo.marginBalance)
      ? this.marginInfo.marginBalance.toFixed(2)
      : '-'

    const marginNet = this.marginInfo && _isFinite(this.marginInfo.marginNet)
      ? this.marginInfo.marginNet.toFixed(2)
      : '-'

    const tradableBalance = _isFinite(+marginNet) && this.marketInfo
      ? colors.bgMagenta.black(`${(marginNet * this.marketInfo.maxLeverage).toFixed(2)}`)
      : '-'

    const maxLeverage = this.marketInfo && this.marketInfo.maxLeverage
      ? `${this.marketInfo.maxLeverage.toFixed(1)}`
      : '-'

    const quickOrderSize = this.getHost().getQuickOrderSize()
    const tradeSizeAlert = this.getHost().getTradeSizeAlertThreshold()
    const groupSizeAlert = this.getHost().getGroupSizeAlertThreshold()

    this.setContent([
      `Quick Order Size: ${`${+prepareAmount(quickOrderSize)}`.green}`,
      '',
      `Size Alert: ${`${tradeSizeAlert.toFixed(2)}`.yellow}`,
      `Group Size Alert: ${`${groupSizeAlert.toFixed(2)}`.yellow}`,
      '',
      `P/L: ${this.balancesVisible ? plCL(pl) : CENSOR_STR}`,
      `Balance: ${this.balancesVisible ? marginBalance.green : CENSOR_STR}`,
      `Net: ${this.balancesVisible ? marginNet.green : CENSOR_STR}`,
      `Tradable: ${this.balancesVisible ? tradableBalance : CENSOR_STR}`,
      '',
      `Min Size: ${`${this.marketInfo && (this.marketInfo.minTradeSize || '-')}`.yellow}`,
      `Max Leverage: ${maxLeverage.yellow}`,
      `Price Prec: ${`${this.marketInfo && this.marketInfo.pricePrecision}`.yellow}`,
      `Last Price: ${colors.underline(lastPrice)}`
    ].join('\n'))

    this.render()
  }
}

module.exports = StatusWidget
