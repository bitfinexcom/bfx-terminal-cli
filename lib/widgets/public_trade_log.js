'use strict'

const colors = require('colors')
const blessed = require('blessed')
const { prepareAmount, preparePrice } = require('bfx-api-node-util')

const Widget = require('./widget')
const scrollableWidgetOptions = require('../util/scrollable_widget_options')

class PublicTradeLogWidget extends Widget {
  constructor (terminal, { geo }) {
    super('public-trade-log', {
      geo,
      terminal,
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
        wsTradeEntry: 'onPublicTrade'
      }
    })
  }

  onPublicTrade ({ trade }) {
    const { amount, price } = trade
    const tradeSizeAlertThreshold = this.getTerminal().getTradeSizeAlertThreshold()
    const cl = amount < 0
      ? amount < (-1 * tradeSizeAlertThreshold)
        ? colors.bgRed.black
        : colors.red
      : amount > tradeSizeAlertThreshold
        ? colors.bgGreen.black
        : colors.green

    this.pushLine(`${cl(prepareAmount(amount))} @ ${preparePrice(price)}`)
    this.scrollTo(this.getLines().length)
    this.render()
  }
}

module.exports = PublicTradeLogWidget
