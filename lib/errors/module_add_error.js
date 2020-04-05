'use strict'

/**
 * An error representing an issue with adding a module to a terminal
 */
class ModuleAddError extends Error {
  constructor (message) {
    super(message)

    this.name = 'ModuleAddError'
    this.message = message
  }
}

module.exports = ModuleAddError
