'use strict'

const _isFunction = require('lodash/isFunction')
const measureDuration = require('../../util/measure_duration')
const Plugin = require('../plugin')

/**
 * Provides basic utilities on the host object
 *
 * @extends Plugin
 */
class UtilitiesPlugin extends Plugin {
  /**
   * @param {ModuleHost} host - host instance
   */
  constructor (host) {
    super('core:utilities', {
      host,
      requiredModules: [
        'plugin:core:logger'
      ],

      hostMethods: [
        'logDuration'
      ]
    })
  }

  /**
   * Helper to log the duration of an operation in a standard way. Host method.
   *
   * @see module:Utility.measureDuration
   * @alias ModuleHost.logDuration
   * @example
   *   const res = await (this.logDuration('leverage info fetch')(async () => {
   *     return rest.conf(['pub:info:pair'])
   *   }))
   *
   * @param {string} operationLabel - descriptive operation label to log
   * @param {boolean} [updateLogLine] - default true, enables overwrite of
   *   duration start log line w/ end line
   * @param {...*} [measureDurationArgs] - passed to `measureDuration` call
   * @returns {Function} measure - execute with async operation as 1st param,
   *   and optional duration callback as 2nd
   */
  logDuration (operationLabel, updateLogLine, ...measureDurationArgs) {
    this.getHost().logInfo('started: %s', operationLabel)
    const d = measureDuration(...measureDurationArgs)

    return async (handler, durationCB) => {
      const res = await handler()
      const duration = d()

      if (_isFunction(durationCB)) {
        await durationCB(duration)
      }

      if (updateLogLine !== false) {
        this.getHost().logDebugClearLastLine()
      }

      this.getHost().logInfo('done: %s %s', operationLabel, duration)

      return res
    }
  }
}

module.exports = UtilitiesPlugin
