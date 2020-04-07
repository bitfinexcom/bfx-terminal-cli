'use strict'

const colors = require('colors')
const blessed = require('blessed')
const { prepareAmount, preparePrice } = require('bfx-api-node-util')

const Widget = require('./widget')
const scrollableWidgetOptions = require('../util/scrollable_widget_options')

/**
 * Displays a scrollable list of public trades for the terminal's symbol.
 * Trades are colored based on direction and highlighted based on the trade
 * size alerting threshold.
 *
 * @listens TradesDataPlugin~dataTradeEntry
 */
class PublicTradeLogWidget extends Widget {
  constructor (host, { geo }) {
    super('public-trade-log', {
      geo,
      host,
      requiredModules: [
        'plugin:alerts:trade-size',
        'plugin:data:trades'
      ],

      element: blessed.element,
      elementOptions: {
        ...scrollableWidgetOptions,
        label: 'Trade Log (No Data)',
        alwaysScroll: true,
        align: 'center',
        style: {
          ...scrollableWidgetOptions.style,
          border: { fg: 'gray' }
        }
      },

      hooks: {
        dataTradeEntry: 'onPublicTrade'
      }
    })

    this.lastTradeLag = -1
  }

  genLabelText () {
    if (this.lastTradeLag === -1) {
      return 'Trade Log (No Data)'
    }

    const cl = this.lastTradeLag < 75
      ? colors.green
      : this.lastTradeLag < 200
        ? colors.magenta
        : colors.red

    return `Trade Log (~${cl(`${this.lastTradeLag}ms`)} lag)`
  }

  onPublicTrade ({ trade, lag }) {
    this.lastTradeLag = lag

    const { amount, price } = trade
    const threshold = this.getHost().getTradeSizeAlertThreshold()
    const cl = amount < 0
      ? threshold !== 0 && amount < (-1 * threshold)
        ? colors.bgRed.black
        : colors.red
      : threshold !== 0 && amount > threshold
        ? colors.bgGreen.black
        : colors.green

    this.setLabel({ text: this.genLabelText() })
    this.pushLine(`${cl(prepareAmount(amount))} @ ${preparePrice(price)}`)
    this.scrollTo(this.getLines().length)
    this.render()
  }
}

module.exports = PublicTradeLogWidget
