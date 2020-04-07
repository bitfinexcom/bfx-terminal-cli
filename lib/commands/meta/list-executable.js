'use strict'

require('colors')
const _keys = require('lodash/keys')
const Command = require('../command')

require('../../types/command_yargs_definition')

/**
 * Executes an arbitrary host function with parsed arguments and displays the
 * output
 *
 * @extends Command
 */
class ListExecutableCommand extends Command {
  /**
   * @param {ModuleHost} host - host instance
   */
  constructor (host) {
    super('meta:list-executable', {
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
      command: 'list-executable',
      description: 'list all executable host functions',
      aliases: ['ls-ex']
    }
  }

  /**
   * Clears the terminal output
   *
   * @private
   * @async
   */
  handler () {
    const host = this.getHost()
    const methods = host.getModuleHostMethods()

    host.logOutput('Available host methods:')

    _keys(methods).forEach((methodName) => {
      const { id, type } = methods[methodName]

      host.logOutput(
        '  %s (from %s type %s)',
        methodName.blue, id.green,
        (/async/.test(type) ? 'async'.red : 'sync'.magenta)
      )
    })
  }
}

module.exports = ListExecutableCommand
