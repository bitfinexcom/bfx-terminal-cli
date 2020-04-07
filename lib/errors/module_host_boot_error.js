'use strict'

/**
 * An error which occured while trying to boot a {@link ModuleHost} instance
 */
class ModuleHostBootError extends Error {
  constructor (message) {
    super(message)

    this.name = 'ModuleHostBootError'
    this.message = message
  }
}

module.exports = ModuleHostBootError
