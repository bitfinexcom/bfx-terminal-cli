'use strict'

const Plugin = require('../plugin')

require('../../types/market_info')

/**
 * Propagates market info data
 *
 * @extends Plugin
 */
class MarketInfoDataPlugin extends Plugin {
  /**
   * @param {ModuleHost} host - host instance
   */
  constructor (host) {
    super('data:market-info', {
      host,
      requiredModules: ['plugin:core:logger'],
      providedHooks: ['dataMarketInfo'],
      hooks: {
        hostBoot: 'onHostBoot'
      },

      hostMethods: [
        'getMarketInfo'
      ]
    })

    this.marketInfo = null
  }

  /**
   * Returns last known market info data for the terminal's active symbol
   *
   * @returns {MarketInfo} info
   */
  getMarketInfo () {
    return this.marketInfo
  }

  /**
   * Fetches initial market info data via RESTv2
   *
   * @listens ModuleHost~hostBoot
   * @fires MarketInfoDataPlugin~dataMarketInfo
   * @private
   * @async
   */
  async onHostBoot () {
    const symbol = this.getTerminal().getSymbol()
    const rest = this.getTerminal().getREST()

    const res = await (this.logDuration('leverage info fetch')(async () => {
      return rest.conf(['pub:info:pair'])
    }))

    const [info] = res
    const marketInfo = info.find(l => l[0] === symbol.substring(1))

    if (!marketInfo) {
      throw new Error(`Failed to fetch market information for symbol ${symbol}`)
    }

    const leverage = marketInfo[1][8]
    const maxLeverage = leverage === 0 ? 0 : (1 / marketInfo[1][8])
    const minTradeSize = +marketInfo[1][3]

    this.marketInfo = {
      maxLeverage: leverage === 0 ? 0 : (1 / marketInfo[1][8]),
      minTradeSize: +marketInfo[1][3]
    }

    const allSymbols = await (this.logDuration('symbol details fetch')(async () => {
      return rest.symbolDetails()
    }))

    const data = allSymbols.find(d => (
      d.pair === symbol.substring(1).toLowerCase()
    ))

    if (!data) {
      throw new Error(`Failed to fetch symbol details for symbol ${symbol}`)
    }

    this.marketInfo = {
      symbol,
      maxLeverage,
      minTradeSize,
      pricePrecision: data.price_precision // eslint-disable-line
    }

    /**
     * Fired when market info data is updated for the terminal's active symbol
     *
     * @event MarketInfoDataPlugin~dataMarketInfo
     * @property {MarketInfo} info - market info
     */
    return this.emit('dataMarketInfo', { info: this.marketInfo })
  }
}

module.exports = MarketInfoDataPlugin
