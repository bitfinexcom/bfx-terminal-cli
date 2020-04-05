'use strict'

const colors = require('colors')
const defineCommandYargs = require('../util/define_command_yargs')

const listCommand = (terminal, l) => y => defineCommandYargs(y, {
  command: 'list',
  description: 'View the list of configurable settings and their values',
  epilogue: 'See \'get\' and \'set\' commands',
  handler: () => {
    const config = terminal.getConfigurableOptions()
    const settings = Object.keys(config)

    l('Configurable settings:')

    settings.forEach((setting) => {
      l(
        '  %s: %s (%s)%s', colors.blue(setting),
        colors.yellow(config[setting].description),
        colors.blue(`${config[setting].get()}`),
        config[setting].choices
          ? ` [choices ${colors.magenta(config[setting].choices.join(', '))}]`
          : ''
      )
    })
  }
})

module.exports = listCommand
