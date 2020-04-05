
'use strict'

const colors = require('colors')
const defineCommandYargs = require('../util/define_command_yargs')

const getCommand = (terminal, l) => y => defineCommandYargs(y, {
  command: 'get <setting>',
  description: 'Read a setting value',

  options: {
    setting: {
      alias: 's',
      type: 'string',
      describe: 'Name of setting to change',
      choices: Object.keys(terminal.getConfigurableOptions())
    }
  },

  handler: (argv) => {
    const { setting } = argv
    const config = terminal.getConfigurableOptions()
    const value = config[setting].get()

    l('\'%s\' = %s', colors.blue(setting), colors.yellow(value))
  }
})

module.exports = getCommand
