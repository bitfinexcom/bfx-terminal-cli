'use strict'
// @flow

const signale = require('signale')

type handlerFunction = (Object) => Promise<void>

const execHandler = (handler: handlerFunction): handlerFunction => {
  return async (argv?: Object): Promise<void> => {
    try {
      await handler(argv)
    } catch (e) {
      signale.error('Error: %s', e.stack)
    }
  }
}

module.exports = execHandler
