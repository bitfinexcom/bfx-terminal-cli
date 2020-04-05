'use strict'

const _isError = require('lodash/isError')
const _isEmpty = require('lodash/isEmpty')
const ValidationErrors = require('./errors/validation_errors')

const validateMultiple = (id, validators = []) => {
  const errors = validators
    .map(([validator, ...data]) => validator(...data))
    .filter(_isError)

  if (!_isEmpty(errors)) {
    throw new ValidationErrors(id, errors)
  }
}

module.exports = validateMultiple
