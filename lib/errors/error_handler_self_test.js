'use strict'

/**
 * An error meant to be ignored (see terminal boot events)
 */
class ErrorHandlerSelfTestError extends Error {
  constructor (message) {
    super(message)

    this.name = 'ErrorHandlerSelfTest'
    this.message = message
  }
}

module.exports = ErrorHandlerSelfTestError
