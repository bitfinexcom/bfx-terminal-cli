
'use strict'

const _isEmpty = require('lodash/isEmpty')
const _isObject = require('lodash/isObject')
const _isFunction = require('lodash/isFunction')
const ValidationError = require('../errors/validation_error')

const validateMethods = methods => (
  (
    !_isEmpty(methods) && (!_isObject(methods) && !_isFunction(methods))
  ) && new ValidationError({
    value: methods,
    message: (
      'Methods must be an object or function returning an object of named methods'
    )
  })
)

module.exports = validateMethods
