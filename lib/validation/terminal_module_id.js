'use strict'

const _includes = require('lodash/includes')
const _isString = require('lodash/isString')
const _isEmpty = require('lodash/isEmpty')
const ValidationError = require('../errors/validation_error')

const validateTerminalModuleID = id => (
  (
    !_isString(id) || _isEmpty(id) || !_includes(id, ':') ||
    id.split(':').length < 2
  ) && new ValidationError({
    value: id,
    message: [
      'Terminal Module ID must be a colon-delimited string with a non-empty',
      'type as the first token'
    ]
  })
)

module.exports = validateTerminalModuleID
