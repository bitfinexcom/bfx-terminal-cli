'use strict'

const signale = require('signale')
const Plugin = require('./plugin')

class LoggerPlugin extends Plugin {
  constructor (terminal) {
    super('logger', {
      terminal,
      providedHooks: [
        'terminalDebugLog',
        'terminalOutputLog',
        'terminalOutputClear'
      ],

      terminalMethods: () => ({
        l: new signale.Signale({
          stream: {
            end: () => this.render(),
            write: (data) => { // trim newline
              this.emit('terminalDebugLog', data.slice(0, data.length - 1))
            }
          }
        }),

        logOutput: (...data) => {
          this.emit('terminalOutputLog', { data })
        },

        clearLogOutput: () => {
          this.emit('terminalOutputClear')
        }
      })
    })
  }
}

module.exports = LoggerPlugin
