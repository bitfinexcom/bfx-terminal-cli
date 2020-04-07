'use strict'

const _capitalize = require('lodash/capitalize')
const signale = require('signale')
const Plugin = require('../plugin')

const SIGNALE_LOGGERS = [
  'await', 'complete', 'error', 'debug', 'fatal', 'fav', 'info', 'note',
  'pause', 'pending', 'star', 'start', 'success', 'wait', 'warn', 'watch', 'log'
]

/**
 * Provides signale logger methods configured to emit output to the standard
 * terminal debug log, along with console log methods. Both require widgets to
 * be rendered visible.
 *
 * Besides documented methods, a log method is created on the terminal instance
 * for each available signale logger with a `log` prefix, i.e. `logInfo`.
 *
 * This is a required module for a `Terminal` to operate.
 *
 * @fires LoggerPlugin~terminalDebugLog
 * @extends Plugin
 */
class LoggerPlugin extends Plugin {
  /**
   * @param {ModuleHost} host - host instance
   */
  constructor (host) {
    super('core:logger', {
      host,
      providedHooks: [
        'terminalOutputLog',
        'terminalOutputClear',
        'terminalDebugLog',
        'terminalDebugLogClearLastLine'
      ],

      hostMethods: [
        ...SIGNALE_LOGGERS.map(l => `log${_capitalize(l)}`),

        'logOutput',
        'logDebugClearLastLine',
        'clearLogOutput'
      ]
    })

    const l = new signale.Signale({
      stream: {
        end: () => this.render(),
        write: (data) => { // trim newline
          /**
           * Event to add a line to the debug log
           *
           * @event LoggerPlugin~terminalDebugLog
           * @property {string} line - line to be logged
           * @see class:InternalLogWidget
           */
          this.emitSync('terminalDebugLog', {
            line: data.slice(0, data.length - 1)
          })
        }
      }
    })

    SIGNALE_LOGGERS.forEach((name) => {
      this[`log${_capitalize(name)}`] = l[name]
    })
  }

  /**
   * Attached to terminal instance
   *
   * @fires LoggerPlugin~terminalDebugLogClearLastLine
   */
  logDebugClearLastLine () {
    /**
     * Event to clear the last line in the debug log; useful for overwriting
     * it with an update.
     *
     * @event LoggerPlugin~terminalDebugLogClearLastLine
     * @see class:InternalLogWidget
     */
    this.emitSync('terminalDebugLogClearLastLine')
  }

  /**
   * Attached to terminal instance
   *
   * @fires LoggerPlugin~terminalOutputLog
   *
   * @param {...any} data - args for `sprintf`
   */
  logOutput (...data) {
    /**
     * Event to add a line to the console output.
     *
     * @event LoggerPlugin~terminalOutputLog
     * @property {Array[]} data - arguments for `sprintf`
     * @see TerminalOutputWidget
     */
    this.emitSync('terminalOutputLog', { data })
  }

  /**
   * Attached to terminal instance
   *
   * @fires LoggerPlugin~terminalOutputClear
   */
  clearLogOutput () {
    /**
     * Event to clear all console output.
     *
     * @event LoggerPlugin~terminalOutputClear
     * @see class:TerminalOutputWidget
     */
    this.emitSync('terminalOutputClear')
  }
}

module.exports = LoggerPlugin
