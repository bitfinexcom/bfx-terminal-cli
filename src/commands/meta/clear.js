'use strict'

const Command = require('../command')

require('../../types/command_yargs_definition')

/**
 * Clears the terminal output
 *
 * @extends Command
 */
class ClearCommand extends Command {
  /**
   * @param {ModuleHost} host - host instance
   */
  constructor (host) {
    super('meta:clear', {
      host,
      requiredModules: [
        'plugin:core:logger'
      ]
    })
  }

  /**
   * @private
   * @returns {CommandYargsDefinition} definition
   */
  getYArgsDefinition () {
    return {
      command: 'clear',
      description: 'Clear console output',
      aliases: ['cls']
    }
  }

  /**
   * Clears the terminal output
   *
   * @private
   * @async
   */
  async handler () {
    this.getHost().clearLogOutput()
  }
}

module.exports = ClearCommand
