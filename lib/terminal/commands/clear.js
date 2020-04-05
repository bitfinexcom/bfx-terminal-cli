'use strict'

const defineCommandYargs = require('../util/define_command_yargs')

const clearCommand = (terminal) => y => defineCommandYargs(y, {
  command: 'clear',
  description: 'Clear console output',
  aliases: ['cls'],

  handler: () => {
    terminal.clearConsoleOutput()
  }
})

module.exports = clearCommand
