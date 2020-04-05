
'use strict'

const _values = require('lodash/values')
const _isEmpty = require('lodash/isEmpty')
const _isString = require('lodash/isString')
const _isObject = require('lodash/isObject')
const ValidationError = require('../errors/validation_error')

const validateHooks = hooks => (
  (!_isEmpty(hooks) && (
    !_isObject(hooks) || _values(hooks).find(h => !_isString(h))
  )) && new ValidationError({
    value: hooks,
    message: (
      'Hooks must be an object mapping event names to methods on base object'
    )
  })
)

module.exports = validateHooks
