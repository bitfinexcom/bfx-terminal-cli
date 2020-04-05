'use strict'

const colors = require('colors')
const blessed = require('blessed')
const _includes = require('lodash/includes')
const { prepareAmount } = require('bfx-api-node-util')

const Widget = require('./widget')
const USTAR = '★'

class LastTradeGroupWidget extends Widget {
  constructor (terminal, { direction, geo }) {
    if (!_includes([1, -1], direction)) {
      throw new Error('Group direction must be one 1 or -1')
    }

    const directionStr = direction === -1 ? 'sell' : 'buy'
    const groupHook = `${directionStr}TradeGroupUpdate`

    super(`last-trade-group:${directionStr}`, {
      geo,
      terminal,
      element: blessed.element,
      elementOptions: {
        label: `Last ${direction === 1 ? 'Buy' : 'Sell'} Group`,
        style: { border: { fg: 'gray' } },
        border: { type: 'line' },
        tags: true,
        align: 'center',
        valign: 'middle'
      },

      hooks: {
        wsTradeEntry: 'onPublicTrade',
        [groupHook]: 'onGroupUpdate'
      }
    })

    this.direction = direction
  }

  // Update border color to indicate if group is active or not
  onPublicTrade ({ trade }) {
    const { amount } = trade

    if (amount < 0 && this.direction === -1) {
      this.getElement().style.border.fg = 'red'
    } else if (amount > 0 && this.direction === 1) {
      this.getElement().style.border.fg = 'green'
    } else {
      this.getElement().style.border.fg = 'gray'
    }

    this.render()
  }

  onGroupUpdate ({ amount, count }) {
    const threshold = this.getTerminal().getGroupSizeAlertThreshold()
    const fmt = a => a < 0
      ? a < -1 * threshold
        ? colors.bgRed.black
        : colors.red
      : a > threshold
        ? colors.bgGreen.black
        : colors.green

    const stars = new Array(...(new Array(count))).map(() => USTAR).join('')

    this.setContent(fmt(amount)(`${prepareAmount(amount)} ${stars} `))
    this.render()
  }
}

module.exports = LastTradeGroupWidget
