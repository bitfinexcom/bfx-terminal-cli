'use strict'

const colors = require('colors')
const _isEmpty = require('lodash/isEmpty')
const Command = require('../command')

require('../../types/command_yargs_definition')

/**
 * @extends Command
 */
class ListSettingsCommand extends Command {
  /**
   * @param {ModuleHost} host - host instance
   */
  constructor (host) {
    super('settings:list', {
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
    return {
      command: 'list',
      description: 'View the list of configurable settings and their values',
      epilogue: 'See \'get\' and \'set\' commands'
    }
  }

  /**
   * Logs a setting value to the terminal output
   *
   * @private
   */
  handler () {
    const keys = this.getHost().listSettings()

    if (_isEmpty(keys)) {
      this.getHost().logOutput('No configurable settings')
      return
    }

    this.getHost().logOutput('Configurable settings:')

    keys.forEach((key) => {
      const setting = this.getHost().getSettingDefinition(key)

      this.getHost().logOutput(
        '  %s: %s (%s)%s', colors.blue(key),
        colors.yellow(setting.description),
        colors.blue(`${setting.value}`),
        setting.choices
          ? ` [choices ${colors.magenta(setting.choices.join(', '))}]`
          : ''
      )
    })
  }
}

module.exports = ListSettingsCommand
