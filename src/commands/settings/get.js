
'use strict'

const colors = require('colors')
const Command = require('../command')

require('../../types/command_yargs_definition')

/**
 * @extends Command
 */
class GetSettingCommand extends Command {
  /**
   * @param {ModuleHost} host - host instance
   */
  constructor (host) {
    super('settings:get', {
      host,
      requiredModules: [
        'plugin:core:logger',
        'plugin:core:settings'
      ]
    })
  }

  /**
   * @private
   * @returns {CommandYargsDefinition} definition
   */
  getYArgsDefinition () {
    const host = this.getHost()

    return {
      command: 'get <setting>',
      description: 'Read a setting value',

      options: {
        setting: {
          alias: 's',
          type: 'string',
          describe: 'Name of setting to read',
          choices: host.listSettings()
        }
      }
    }
  }

  /**
   * Logs a setting value to the terminal output
   *
   * @private
   *
   * @param {object} argv - command arguments
   * @param {number} argv.setting - setting key
   */
  async handler (argv) {
    const { setting } = argv
    const value = this.getHost().getSetting(setting)

    this.getHost().logOutput('\'%s\' = %s', colors.blue(setting), colors.yellow(value))
  }
}

module.exports = GetSettingCommand
