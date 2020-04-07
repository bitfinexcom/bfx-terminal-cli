'use strict'

const Plugin = require('../plugin')

require('../../types/position')

/**
 * Propagates account position events
 *
 * @extends Plugin
 */
class PositionsDataPlugin extends Plugin {
  /**
   * @param {Terminal} terminal - terminal instance
   */
  constructor (terminal) {
    super('data:positions', {
      terminal,
      requiredModules: [
        'plugin:ws:connection'
      ],

      providedHooks: [
        'dataPositionSnapshot',
        'dataPositionUpdated',
        'dataPositionCreated',
        'dataPositionClosed'
      ],

      hooks: {
        wsAuthenticated: 'onWSAuthenticated'
      }
    })
  }

  /**
   * Binds position event listeners and emitters
   *
   * @listens WSConnectionPlugin~wsAuthenticated
   * @fires PositionsDataPlugin~dataPositionSnapshot
   * @fires PositionsDataPlugin~dataPositionUpdated
   * @fires PositionsDataPlugin~dataPositionCreated
   * @fires PositionsDataPlugin~dataPositionClosed
   * @private
   *
   * @param {object} data - payload
   * @param {WSv2} data.ws - WSv2 client instance
   */
  onWSAuthenticated ({ ws }) {
    ws.onPositionSnapshot({}, (snapshot) => {
      /**
       * Fired when a position snapshot is received upon initial auth
       *
       * @event PositionsDataPlugin~dataPositionSnapshot
       * @property {Position[]} snapshot
       */
      this.emitSync('dataPositionSnapshot', { snapshot })
    })

    ws.onPositionUpdate({}, (position) => {
      /**
       * Fired when a position is updated
       *
       * @event PositionsDataPlugin~dataPositionUpdated
       * @property {Position} position
       */
      this.emitSync('dataPositionUpdated', { position })
    })

    ws.onPositionClose({}, (position) => {
      /**
       * Fired when a position is closed
       *
       * @event PositionsDataPlugin~dataPositionClosed
       * @property {Position} position
       */
      this.emitSync('dataPositionClosed', { position })
    })

    ws.onPositionNew({}, (position) => {
      /**
       * Fired when a position is created
       *
       * @event PositionsDataPlugin~dataPositionCreated
       * @property {Position} position
       */
      this.emitSync('dataPositionCreated', { position })
    })
  }
}

module.exports = PositionsDataPlugin
