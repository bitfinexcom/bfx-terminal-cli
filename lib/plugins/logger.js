'use strict'

const _capitalize = require('lodash/capitalize')
const signale = require('signale')
const Plugin = require('./plugin')

const SIGNALE_LOGGERS = [
  'await', 'complete', 'error', 'debug', 'fatal', 'fav', 'info', 'note',
  'pause', 'pending', 'star', 'start', 'success', 'wait', 'warn', 'watch', 'log'
]

class LoggerPlugin extends Plugin {
  constructor (terminal) {
    super('logger', {
      terminal,
      providedHooks: [
        'terminalDebugLog',
        'terminalOutputLog',
        'terminalOutputClear'
      ],

      terminalMethods: [
        ...SIGNALE_LOGGERS.map(l => `log${_capitalize(l)}`),

        'logOutput',
        'clearLogOutput'
      ]
    })

    const l = new signale.Signale({
      stream: {
        end: () => this.render(),
        write: (data) => { // trim newline
          this.emit('terminalDebugLog', data.slice(0, data.length - 1))
        }
      }
    })

    SIGNALE_LOGGERS.forEach((name) => {
      this[`log${_capitalize(name)}`] = l[name]
    })
  }

  logOutput (...data) {
    this.emit('terminalOutputLog', { data })
  }

  clearLogOutput () {
    this.emit('terminalOutputClear')
  }
}

module.exports = LoggerPlugin
