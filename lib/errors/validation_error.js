'use strict'

/**
 * An error object representing a field which failed validation
 *
 * @typedef {Error} ValidationError
 * @property {string} message - description of validation failure
 * @property {any} value - value that failed validation
 */
class ValidationError extends Error {
  constructor ({ message, value }) {
    super(message)

    this.name = 'ValidationError'
    this.message = message
    this.value = value
  }
}

module.exports = ValidationError
