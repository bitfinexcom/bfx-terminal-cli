
'use strict'

const colors = require('colors')
const _isEmpty = require('lodash/isEmpty')
const Command = require('../command')

require('../../types/command_yargs_definition')

/**
 * @extends Command
 */
class SetSettingCommand extends Command {
  /**
   * @param {ModuleHost} host - host instance
   */
  constructor (host) {
    super('settings:set', {
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
      command: 'set <setting> <value>',
      description: [
        'Set a config setting; Use \'list\' to get available settings and \'get\'',
        'to read individual values'
      ].join(' '),

      options: {
        setting: {
          alias: 's',
          type: 'string',
          describe: 'Name of setting to change',
          choices: host.listSettings()
        },

        value: {
          alias: 'v',
          describe: 'Desired option value to set'
        }
      },

      extra: {
        check: (argv) => {
          const { setting, value } = argv
          const validationError = this.getHost().validateSetting(setting, value)

          if (!_isEmpty(validationError)) {
            throw new Error(validationError)
          }

          return true
        }
      }
    }
  }

  /**
   * Updates a setting value
   *
   * @private
   *
   * @param {object} argv - command arguments
   * @param {number} argv.setting - setting key
   * @param {string|number} argv.value - new setting value
   */
  async handler (argv) {
    const { setting, value } = argv

    await this.getHost().setSetting(setting, value)

    this.getHost().logOutput(
      'Setting %s set to %s',
      colors.blue(setting), colors.yellow(value)
    )
  }
}

module.exports = SetSettingCommand
