'use strict'

const PI = require('p-iteration')
const _keys = require('lodash/keys')
const _last = require('lodash/last')
const _values = require('lodash/values')
const { TIME_FRAMES } = require('bfx-hf-util')
const Plugin = require('../plugin')

require('../../types/trade')
require('../../types/candle')

const TIME_FRAME_LIST = _values(TIME_FRAMES)

/**
 * Subscribes to the public candles channel for the terminal's symbol and
 * all timeframes, and propagates events.
 *
 * @extends Plugin
 */
class CandlesDataPlugin extends Plugin {
  /**
   * Fired when a candle snapshot or update is received
   *
   * @event CandlesDataPlugin~dataCandles
   * @property {string} key - candle channel key
   * @property {string} symbol - candle symbol
   * @property {string} tf - candle tf
   * @property {Candle[]} candles - snapshot array (last 240 candles) or
   *   candle update including current & previous candles
   */

  /**
   * @param {Terminal} terminal - terminal instance
   */
  constructor (terminal) {
    super('data:candles', {
      terminal,
      requiredModules: [
        'plugin:ws:connection',
        'plugin:data:trades'
      ],

      providedHooks: [
        'dataCandles'
      ],

      hooks: {
        wsOpened: 'onWSOpened',
        dataTradeEntry: 'onTradeEntry'
      },

      terminalMethods: [
        'getCandleData'
      ]
    })

    this.candleData = {} // candle key used
  }

  /**
   * Updates last candle close price for all timeframes on received trade by
   * trade symbol
   *
   * @fires CandlesDataPlugin~dataCandles
   * @private
   *
   * @param {object} data - payload
   * @param {string} data.symbol - trade symbol
   * @param {Trade} data.trade - trade
   */
  async onTradeEntry ({ symbol, trade }) {
    const { price } = trade

    return PI.forEach(_keys(this.candleData), (key) => {
      const [, tf, candleSetSymbol] = key.split(':')

      if (candleSetSymbol !== symbol) {
        return
      }

      const candles = this.candleData[key]

      _last(candles).close = price

      return this.emit('dataCandles', { key, symbol, tf, candles })
    })
  }

  /**
   * Attached to terminal instance; allows retrieving candle data for a key
   *
   * @param {string} key - channel key
   * @returns {Candle[]} candles
   */
  getCandleData (key) {
    return this.candleData[key] || []
  }

  /**
   * Subscribes to and binds listeners/event emitters for each candle
   * timeframe/active terminal symbol combo.
   *
   * @fires CandlesDataPlugin~dataCandles
   * @private
   * @async
   *
   * @param {object} data - payload
   * @param {WSv2} data.ws - WSv2 client
   */
  async onWSOpened ({ ws }) {
    const symbol = this.getSymbol()

    return PI.forEach(TIME_FRAME_LIST, async (tf) => {
      const key = `trade:${tf}:${symbol}`

      ws.onCandle({ key }, (candles) => {
        if (candles.length > 2) {
          this.candleData[key] = candles

        // NOTE: If not snapshot, current & previous candle are received
        // together
        } else {
          if (!this.candleData[key]) {
            throw new Error('Received single candle update prior to snapshot')
          }

          const data = this.candleData[key]

          Object.assign(data[data.length - 1], candles[0])
          Object.assign(data[data.length - 2], candles[1])
        }

        this.emitSync('dataCandles', { key, symbol, tf, candles })
      })

      return ws.subscribeCandles(key)
    })
  }
}

module.exports = CandlesDataPlugin
