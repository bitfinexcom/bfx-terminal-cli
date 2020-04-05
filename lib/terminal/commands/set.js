
'use strict'

const colors = require('colors')
const defineCommandYargs = require('../util/define_command_yargs')

const setCommand = (terminal, l) => y => {
  const config = terminal.getConfigurableOptions()

  return defineCommandYargs(y, {
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
        choices: Object.keys(config)
      },

      value: {
        alias: 'v',
        describe: 'Desired option value to set',
        type: config.type,
        ...(config.choices ? { choices: config.choices } : {})
      }
    },

    extra: {
      check: (argv) => {
        const { setting, value } = argv
        const config = terminal.getConfigurableOptions()[setting]

        if (config.validate && !config.validate(value)) {
          throw new Error(`Invalid value for setting ${setting}`)
        }

        return true
      }
    },

    handler: (argv) => {
      const { setting, value } = argv
      const settingConfig = terminal.getConfigurableOptions()[setting]
      const settingValue = settingConfig.transform
        ? settingConfig.transform(value)
        : value

      settingConfig.set(settingValue)

      l('Setting %s set to %s', colors.blue(setting), colors.yellow(value))
    }
  })
}

module.exports = setCommand
