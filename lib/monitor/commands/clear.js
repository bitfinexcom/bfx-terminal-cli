'use strict'

const defineCommandYargs = require('../util/define_command_yargs')

const clearCommand = (monitor) => y => defineCommandYargs(y, {
  command: 'clear',
  description: 'Clear console output',
  aliases: ['cls'],

  handler: () => {
    monitor.clearConsoleOutput()
  }
})

module.exports = clearCommand
