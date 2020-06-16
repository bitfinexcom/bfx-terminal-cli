
'use strict'

const _isObject = require('lodash/isObject')
const _isFinite = require('lodash/isFinite')
const ValidationError = require('../errors/validation_error')

const validateWidgetGeometry = geo => (
  (!_isObject(geo) || (
    (!_isFinite(geo.x) || geo.x < 0) ||
    (!_isFinite(geo.y) || geo.y < 0) ||
    (!_isFinite(geo.w) || geo.w < 0) ||
    (!_isFinite(geo.h) || geo.h < 0)
  )) && new ValidationError({
    value: geo,
    message: 'Widget geometry must be an object with position x, y, w, h keys'
  })
)

module.exports = validateWidgetGeometry
