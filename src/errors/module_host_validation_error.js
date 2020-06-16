'use strict'

/**
 * An error which occured during module host validation
 */
class ModuleHostValidationError extends Error {
  constructor (message) {
    super(message)

    this.name = 'ModuleHostValidationError'
    this.message = message
  }
}

module.exports = ModuleHostValidationError
