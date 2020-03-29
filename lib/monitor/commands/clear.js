'use strict'

const clearCommand = (monitor) => ({
  matcher: new RegExp(/^clear/),
  help: {
    command: 'clear',
    description: 'Clear console output',
    aliases: ['cls']
  },

  handler: () => {
    monitor.clearConsoleOutput()
  }
})

module.exports = clearCommand
