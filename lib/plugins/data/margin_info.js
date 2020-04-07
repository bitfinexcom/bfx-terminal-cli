'use strict'

const Plugin = require('../plugin')

require('../../types/margin_info_base')

/**
 * Fired when margin info data is updated
 *
 * @event MarginInfoDataPlugin~dataMarginInfo
 * @property {MarginInfoBase} info
 */

/**
 * Propagates margin info data
 *
 * @extends Plugin
 */
class MarginInfoDataPlugin extends Plugin {
  /**
   * @param {Terminal} terminal - terminal instance
   */
  constructor (terminal) {
    super('data:margin-info', {
      terminal,
      requiredModules: [
        'plugin:core:logger',
        'plugin:ws:connection'
      ],

      providedHooks: [
        'dataMarginInfo'
      ],

      hooks: {
        terminalBooted: 'onTerminalBooted',
        wsAuthenticated: 'onWSAuthenticated'
      },

      terminalMethods: [
        'getMarginInfo'
      ]
    })

    this.marginInfo = null
  }

  /**
   * Return last known margin info
   *
   * @return {MarginInfoBase|null} info - null if no data yet received
   */
  getMarginInfo () {
    return this.marginInfo
  }

  /**
   * Fetches initial margin info data via RESTv2
   *
   * @listens Terminal~terminalBooted
   * @fires MarginInfoDataPlugin~dataMarginInfo
   * @private
   */
  async onTerminalBooted () {
    const rest = this.getTerminal().getREST()

    this.marginInfo = await (this.logDuration('margin info fetch')(async () => {
      return rest.marginInfo()
    }))

    return this.emit('dataMarginInfo', { info: this.marginInfo })
  }

  /**
   * Registers event listener/emitter for base margin info updates
   *
   * @listens WSConnectionPlugin~wsAuthenticated
   * @fires MarginInfoDataPlugin~dataMarginInfo
   * @private
   *
   * @param {object} data - payload
   * @param {WSv2} data.ws - WSv2 client
   */
  onWSAuthenticated ({ ws }) {
    ws.onMarginInfoUpdate({}, (info) => {
      if (info.type !== 'base') {
        return
      }

      this.marginInfo = info
      this.emitSync('dataMarginInfo', { info })
    })
  }
}

module.exports = MarginInfoDataPlugin
