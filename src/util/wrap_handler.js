'use strict'

const signale = require('signale')

const execHandler = handler => async (argv) => {
  try {
    await handler(argv)
  } catch (e) {
    signale.error('Error: %s', e.stack)
  }
}

module.exports = execHandler
