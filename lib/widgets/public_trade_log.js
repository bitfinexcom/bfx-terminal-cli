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
  constructor (terminal, { geo }) {
    super('public-trade-log', {
      geo,
      terminal,
      requiredModules: [
        'plugin:alerts:trade-size',
        'plugin:data:trades'
      ],

      element: blessed.element,
      elementOptions: {
        ...scrollableWidgetOptions,
        label: 'Trade Log',
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
  }

  onPublicTrade ({ trade }) {
    const { amount, price } = trade
    const threshold = this.getTerminal().getTradeSizeAlertThreshold()
    const cl = amount < 0
      ? threshold !== 0 && amount < (-1 * threshold)
        ? colors.bgRed.black
        : colors.red
      : threshold !== 0 && amount > threshold
        ? colors.bgGreen.black
        : colors.green

    this.pushLine(`${cl(prepareAmount(amount))} @ ${preparePrice(price)}`)
    this.scrollTo(this.getLines().length)
    this.render()
  }
}

module.exports = PublicTradeLogWidget
