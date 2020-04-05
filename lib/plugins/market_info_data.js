'use strict'

const Plugin = require('./plugin')

class MarketInfoDataPlugin extends Plugin {
  constructor (terminal) {
    super('market-info', {
      terminal,
      requiredModules: ['plugin:logger'],
      providedHooks: ['dataMarketInfo'],
      hooks: {
        terminalBooted: 'onTerminalBooted'
      },

      terminalMethods: [
        'getMarketInfo'
      ]
    })

    this.marketInfo = null
  }

  getMarketInfo () {
    return this.marketInfo
  }

  onTerminalBooted () {
    const symbol = this.getTerminal().getSymbol()
    const rest = this.getTerminal().getREST()
    const l = this.getTerminal().logInfo

    l('fetching leverage info...')

    rest.conf(['pub:info:pair']).then((res) => {
      const [info] = res
      const marketInfo = info.find(l => l[0] === symbol.substring(1))

      if (!marketInfo) {
        throw new Error(`Failed to fetch market information for symbol ${symbol}`)
      }

      this.marketInfo = {
        maxLeverage: 1 / marketInfo[1][8],
        minTradeSize: +marketInfo[1][3]
      }

      l(
        'got max leverage of %f and min trade size of %f for market %s',
        this.marketInfo.maxLeverage.toFixed(1), this.marketInfo.minTradeSize,
        symbol
      )

      l('fetching market info...')

      return rest.symbolDetails()
    }).then((allSymbols) => {
      const data = allSymbols.find(d => (
        d.pair === symbol.substring(1).toLowerCase()
      ))

      if (!data) {
        throw new Error(`Failed to fetch symbol details for symbol ${symbol}`)
      }

      this.marketInfo.pricePrecision = data.price_precision // eslint-disable-line

      this.emit('dataMarketInfo', this.marketInfo)

      return this.marketInfo
    }).catch((error) => {
      this.getTerminal().logError('Market info load error: %s', error.message)
    })
  }
}

module.exports = MarketInfoDataPlugin
