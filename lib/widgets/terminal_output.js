'use strict'

const { sprintf } = require('sprintf-js')
const blessed = require('blessed')
const Widget = require('./widget')
const scrollableWidgetOptions = require('../util/scrollable_widget_options')

class TerminalOutputWidget extends Widget {
  constructor (terminal, { geo }) {
    super('terminal-output', {
      geo,
      terminal,
      element: blessed.element,
      elementOptions: {
        label: 'Terminal Output',
        alwaysScroll: true,
        ...scrollableWidgetOptions
      },

      hooks: {
        terminalOutputLog: 'onTerminalOutputLog',
        terminalOutputClear: 'onTerminalOutputClear',
        terminalBooted: 'onTerminalBooted'
      }
    })
  }

  onTerminalBooted () {
    this.pushLine('Booted! Loaded modules:')

    this.getTerminal().getModules().forEach((m) => {
      this.pushLine(`  - ${m.getColoredID()}`)
    })

    this.scrollToEnd()
    this.render()
  }

  onTerminalOutputClear () {
    this.setContent('')
    this.scrollToEnd()
  }

  onTerminalOutputLog ({ data }) {
    const str = sprintf(...data)

    this.pushLine(str)
    this.scrollToEnd()
    this.render()
  }
}

module.exports = TerminalOutputWidget
