'use strict'

const handler = require('./handler')
const wrapHandler = require('../../util/wrap_handler')

const runCommand = {
  command: 'run [market]',
  describe: 'Execute bot',
  builder: {
    market: {
      alias: 'm',
      type: 'string',
      description: 'Market to operate on'
    }
  },

  handler: wrapHandler(handler)
}

module.exports = runCommand
