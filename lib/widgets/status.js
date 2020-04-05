'use strict'

const colors = require('colors')
const blessed = require('blessed')
const _debounce = require('lodash/debounce')
const _isFinite = require('lodash/isFinite')
const { preparePrice, prepareAmount } = require('bfx-api-node-util')
const Widget = require('./widget')

const BALANCES_VISIBLE_SETTING = 'status.balances-visible'
const MAX_UPDATE_INTERVAL_MS = 2 * 1000
const CENSOR_STR = 'HIDDEN'

class StatusWidget extends Widget {
  constructor (terminal, { geo }) {
    super('status', {
      geo,
      terminal,
      providesHooks: ['balancesVisible'],
      requiresModule: [
        'plugin:settings',
        'plugin:margin-info',
        'plugin:market-info',
        'plugin:trade-size-alerts',
        'plugin:trade-group-size-alerts'
      ],

      unique: true,
      element: blessed.box,
      elementOptions: {
        label: 'Status',
        style: { border: { fg: 'gray' } }
      },

      hooks: {
        wsTradeEntry: 'onPublicTrade',
        dataMarketInfo: 'onMarketInfo',
        dataMarginInfo: 'onMarginInfo',
        tradeSizeAlertThresholdUpdated: 'onGenericUpdate',
        groupSizeAlertThresholdUpdated: 'onGenericUpdate'
      }
    })

    this.update = _debounce(this.update, MAX_UPDATE_INTERVAL_MS)

    this.balancesVisible = true
    this.lastTradePrice = null
    this.marketInfo = this.getTerminal().getMarketInfo()
    this.marginInfo = this.getTerminal().getMarginInfo()

    this.getTerminal().defineSetting({
      key: BALANCES_VISIBLE_SETTING,
      description: 'Toggles display of balances in status widget',
      choies: [0, 1],
      value: 1
    })

    this.getTerminal().subscribeSetting(BALANCES_VISIBLE_SETTING, (value) => {
      this.balancesVisible = value === 1
      this.emit('balancesVisibleUpdated')
    })

    this.update()
  }

  onPublicTrade ({ trade }) {
    this.lastTradePrice = trade.price
    this.update()
  }

  onMarginInfo (info) {
    this.marginInfo = info
    this.update()
  }

  onMarketInfo (info) {
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

    this.setContent([
      `Size Alert: ${`${this.getTerminal().getTradeSizeAlertThreshold()}`.yellow}`,
      `Group Size Alert: ${`${this.getTerminal().getGroupSizeAlertThreshold()}`.yellow}`,
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
