'use strict'

const blessed = require('blessed')
const Widget = require('./widget')
const ErrorHandlerSelfTestError = require('../errors/error_handler_self_test')
const scrollableWidgetOptions = require('../util/scrollable_widget_options')

const { VERBOSE_ERRORS } = process.env

/**
 * Widget showing a scrollable list of debug messages, hooks into the core
 * terminal debug log events.
 */
class InternalLogWidget extends Widget {
  constructor (host, { geo }) {
    super('internal-log', {
      geo,
      host,
      element: blessed.element,
      elementOptions: {
        ...scrollableWidgetOptions,
        label: 'Internal Log',
        style: {
          ...scrollableWidgetOptions.style,
          border: { fg: 'gray' }
        }
      },

      hooks: {
        terminalDebugLogClearLastLine: 'onTerminalDebugLogClearLastLine',
        terminalDebugLog: 'onTerminalDebugLog',
        hostError: 'onHostError',
        wsError: 'onWSError'
      }
    })
  }

  /**
   * Forwards error to the debug log
   *
   * @listens WSConnectionPlugin~wsError
   *
   * @param {object} data - data
   * @param {Error} data.error - incoming error object
   */
  onWSError ({ error }) {
    this.onTerminalDebugLog({
      line: error.message || error.msg
    })
  }

  /**
   * Forwards error to the debug log; does nothing if the error is a
   * {@link ErrorHandlerSelfTestError}
   *
   * @listens ModuleHost~hostError
   *
   * @param {object} data - data
   * @param {Error} data.error - incoming error object
   */
  onHostError ({ error }) {
    if (error instanceof ErrorHandlerSelfTestError) {
      return
    }

    this.onTerminalDebugLog({
      line: `Internal error: ${error[VERBOSE_ERRORS ? 'stack' : 'message']}`
    })
  }

  /**
   * Adds the line to the debug log and scrolls to end
   *
   * @listens LoggerPlugin~terminalDebugLog
   *
   * @param {object} data - data
   * @param {string} data.line - line to append to log
   */
  onTerminalDebugLog ({ line }) {
    this.pushLine(line)
    this.scrollTo(this.getLines().length - 1)
  }

  /**
   * Removes the last line of the debug log
   *
   * @listens LoggerPlugin~terminalDebugLogClearLastLine
   */
  onTerminalDebugLogClearLastLine () {
    this.popLine()
    this.scrollTo(this.getLines().length - 1)
  }
}

module.exports = InternalLogWidget
