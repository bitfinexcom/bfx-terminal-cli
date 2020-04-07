'use strict'

const Command = require('../command')

require('../../types/command_yargs_definition')

/**
 * Executes an arbitrary host function with parsed arguments and displays the
 * output
 *
 * @extends Command
 */
class ExecuteCommand extends Command {
  /**
   * @param {ModuleHost} host - host instance
   */
  constructor (host) {
    super('meta:execute', {
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
      command: 'execute',
      description: 'execute an arbitrary host function and log the output',
      aliases: ['ex']
    }
  }

  /**
   * Clears the terminal output
   *
   * @private
   * @async
   */
  handler () {
    throw new Error('Implementation pending')
  }
}

module.exports = ExecuteCommand
