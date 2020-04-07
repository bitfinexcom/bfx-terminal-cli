'use strict'

/**
 * An error object representing multiple validation errors
 *
 * @typedef {Error} ValidationErrors
 */
class ValidationErrors extends Error {
  constructor (context, errors) {
    const message = `${context}: ${errors.map(e => e.message).join('\n')}`

    super(message)

    this.name = 'ValidationErrors'
    this.message = message
  }
}

module.exports = ValidationErrors
