'use strict'

const { WSv2 } = require('bitfinex-api-node')
const Plugin = require('../plugin')

const CALC_REQ_INTERVAL_MS = 5 * 1000 // aggressive

/**
 * Creates a WSv2 connection to bitfinex, opens & authenticates it on terminal
 * boot, and provides basic lifecycle events. The `wsOpened` and
 * `wsAuthenticated` events can be used by other modules to subscribe to
 * channels and/or register their own listeners
 *
 * @extends Plugin
 */
class WSConnectionPlugin extends Plugin {
  /**
   * @param {ModuleHost} host - host instance
   */
  constructor (host) {
    super('ws:connection', {
      host,
      requiredModules: [
        'plugin:core:logger'
      ],

      providedHooks: [
        'wsAuthenticated',
        'wsOpened',
        'wsClosed',
        'wsError'
      ],

      hooks: {
        hostBootStarted: 'onHostBootStarted'
      }
    })

    this.ws = null
  }

  /**
   * Creates the WSv2 connection, opens & authenticates it, and sets up the
   * calc interval for updating position/margin information.
   *
   * @fires WSConnectionPlugin~wsOpened
   * @fires WSConnectionPlugin~wsAuthenticated
   * @listens ModuleHost~hostBootStarted
   * @throws {Error} fails if the WSv2 instance is already initialized
   * @private
   */
  async onHostBootStarted () {
    if (this.ws !== null) {
      throw new Error('WSv2 initialized prior to terminal boot')
    }

    this.ws = new WSv2({
      transform: true,
      autoReconnect: true,
      reconnectDelay: 5 * 1000,
      manageOrderBooks: true,
      ...this.getTerminal().getCredentials()
    })

    this.ws.on('error', this.onError.bind(this))
    this.ws.on('close', this.onClosed.bind(this))

    // events defined here as logDuration syntax breaks JSDoc parsing
    /**
     * Indicates the WSv2 connection is opened; modules should use this event
     * to begin performing operations involving public data.
     *
     * @event WSConnectionPlugin~wsOpened
     * @property {WSv2} ws - WSv2 client
     */

    /**
     * Indicates the WSv2 connection is authenticated; modules should use this
     * event to begin performing operations involving account data.
     *
     * @event WSConnectionPlugin~wsAuthenticated
     * @property {WSv2} ws - WSv2 client
     */

    await (this.logDuration('ws connect')(async () => this.ws.open()))
    await this.emit('wsOpened', { ws: this.ws })

    await (this.logDuration('ws auth')(async () => this.ws.auth()))
    await this.emit('wsAuthenticated', { ws: this.ws })

    setInterval(this.doRequestCalc.bind(this), CALC_REQ_INTERVAL_MS)
  }

  /**
   * Sends a calc request for base margin information, margin tradable balance
   * for the terminal symbol, and position calcs for the terminal symbol.
   *
   * @private
   * @throws {Error} fails if the WSv2 instance is not open
   */
  doRequestCalc () {
    if (!this.ws || !this.ws.isOpen()) {
      throw new Error('WSv2 connection not open')
    }

    const symbol = this.getSymbol()

    this.ws.requestCalc([
      'margin_base',
      `margin_sym_${symbol}`,
      `position_${symbol}`
    ])
  }

  /**
   * @fires WSConnectionPlugin~wsError
   * @private
   *
   * @param {Error} error - error object to propagate
   */
  onError (error) {
    /**
     * A websocket error
     *
     * @event WSConnectionPlugin~wsError
     * @property {Error} error - error object
     * @see InternalLogWidget
     */
    this.emitSync('wsError', { error })
  }

  /**
   * @fires WSConnectionPlugin~wsClosed
   * @private
   */
  onClosed () {
    /**
     * Indicates websocket connection close
     *
     * @event WSConnectionPlugin~wsClosed
     */
    this.emitSync('wsClosed')
  }
}

module.exports = WSConnectionPlugin
