'use strict'

const colors = require('colors')
const _isEmpty = require('lodash/isEmpty')

const helpCommand = (monitor, l) => ({
  matcher: new RegExp(/^help$/),
  help: {
    command: 'help',
    description: 'Show command list'
  },

  handler: () => {
    const commands = monitor.getCommands()

    l('Command list:')

    commands.forEach(({ help }) => {
      const { command, description, examples, aliases } = help

      l(`  ${colors.blue('%s')}: %s`, command, description)

      if (!_isEmpty(aliases)) {
        aliases.forEach((alias) => {
          l(`    alias ${colors.magenta('%s')}`, alias)
        })
      }

      if (!_isEmpty(examples)) {
        examples.forEach((example) => {
          l(`    i.e. ${colors.green('%s')}`, example)
        })
      }
    })
  }
})

module.exports = helpCommand
