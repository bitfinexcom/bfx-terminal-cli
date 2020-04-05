'use strict'

const Plugin = require('./plugin')

class MarginInfoDataPlugin extends Plugin {
  constructor (terminal) {
    super('margin-info', {
      terminal,
      requiredModules: ['plugin:logger'],
      providedHooks: ['dataMarginInfo'],
      hooks: {
        terminalBooted: 'onTerminalBooted',
        wsMarginInfo: 'onWSMarginInfo'
      },

      terminalMethods: [
        'getMarginInfo'
      ]
    })

    this.marginInfo = null
  }

  getMarginInfo () {
    return this.marginInfo
  }

  onTerminalBooted () {
    const rest = this.getTerminal().getREST()
    const l = this.getTerminal().logInfo

    l('fetching margin info...')

    rest.marginInfo().then((marginInfo) => {
      l('got margin info')

      this.marginInfo = marginInfo
      this.emit('dataMarginInfo', this.marginInfo)

      return marginInfo
    }).catch((error) => {
      this.getTerminal().logError('Margin info load error: %s', error.message)
    })
  }

  onWSMarginInfo (marginInfo) {
    this.marginInfo = marginInfo
    this.emit('dataMarginInfo', this.marginInfo)
  }
}

module.exports = MarginInfoDataPlugin
