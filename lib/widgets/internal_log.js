'use strict'

const blessed = require('blessed')
const Widget = require('./widget')
const scrollableWidgetOptions = require('../util/scrollable_widget_options')

class InternalLogWidget extends Widget {
  constructor (terminal, { geo }) {
    super('internal-log', {
      geo,
      terminal,
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
        terminalDebugLog: 'onTerminalDebugLog',
        wsError: 'onWSError'
      }
    })
  }

  onWSError ({ error }) {
    this.onTerminalDebugLog(error.message)
  }

  onTerminalDebugLog (line) {
    this.pushLine(line)
    this.scrollTo(this.getLines().length - 1)
  }
}

module.exports = InternalLogWidget
