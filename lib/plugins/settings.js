'use strict'

const _isUndefined = require('lodash/isUndefined')
const _isFunction = require('lodash/isFunction')
const _isString = require('lodash/isString')
const _isObject = require('lodash/isObject')
const _includes = require('lodash/includes')
const _isEmpty = require('lodash/isEmpty')
const _isArray = require('lodash/isArray')
const _keys = require('lodash/keys')

const Plugin = require('./plugin')

class SettingsPlugin extends Plugin {
  constructor (terminal) {
    super('settings', {
      terminal,
      terminalMethods: [
        'getSetting',
        'setSetting',
        'listSettings',
        'defineSetting',
        'removeSetting',
        'clearSettings',
        'subscribeSetting',
        'unsubscribeSetting'
      ]
    })

    this.settings = {}
  }

  listSettings (namespace) {
    const allKeys = _keys(this.settings)

    return namespace
      ? allKeys
        .map(k => k.split('.'))
        .filter(k => k[0] === namespace)
      : allKeys
  }

  getSetting (key) {
    const setting = this.settings[key]

    return _isObject(setting)
      ? setting.value
      : undefined
  }

  setSetting (key, rawValue) {
    const s = this.settings[key]

    if (_isUndefined(s)) {
      throw new Error(`No setting ${key}`)
    }

    const { validate, transform, choices } = s
    const value = _isFunction(transform) ? transform(rawValue) : rawValue
    const validationError = _isFunction(validate) && !validate(value)

    if (validationError) {
      throw new Error(`Value ${rawValue} failed validation for setting ${key}`)
    }

    if (!_isEmpty(choices) && !_includes(choices, value)) {
      throw new Error(`Value ${rawValue} not valid for setting ${key}`)
    }

    this.settings[key].value = value
    this.notifyListeners(key)
  }

  validate (setting) {
    if (!_isObject(setting)) {
      return 'Setting definition not an object'
    }

    const { key, description, validate, transform, choices } = setting

    if (!_isString(key) || _isEmpty(key)) {
      return 'Setting key required'
    }

    if (!_includes(key, '.')) {
      return 'Key namespace required'
    }

    if (!_isString(description) || _isEmpty(description)) {
      return 'Description required'
    }

    if (!_isUndefined(validate) && !_isFunction(validate)) {
      return 'Validator must be a function if provided'
    }

    if (!_isUndefined(transform) && !_isFunction(transform)) {
      return 'Transformer must be a function if provided'
    }

    if (!_isUndefined(choices) && !_isArray(choices)) {
      return 'Choices must be an array if provided'
    }

    return null
  }

  defineSetting (definition) {
    const validationError = this.validate(definition)

    if (validationError) {
      throw new Error(validationError)
    }

    const { key, ...setting } = definition

    if (this.settings[key]) {
      throw new Error(`Setting ${key} already defined`)
    }

    this.settings[key] = {
      ...setting,
      listeners: []
    }
  }

  subscribeSetting (key, listener) {
    const setting = this.settings[key]

    if (!_isObject(setting)) {
      throw new Error(`No such setting ${key}`)
    }

    setting.listeners.push(listener)
  }

  unsubscribeSetting (key, listener) {
    const setting = this.settings[key]

    if (!_isObject(setting)) {
      throw new Error(`No such setting ${key}`)
    }

    const i = setting.listeners.findIndex(l => l === listener)

    if (i !== -1) {
      setting.listeners.splice(i, 1)
    }
  }

  notifyListeners (key) {
    const setting = this.settings[key]

    if (!_isObject(setting)) {
      throw new Error(`No such setting ${key}`)
    }

    const { listeners, value } = setting

    listeners.forEach(l => l(value))
  }

  removeSetting (key) {
    if (!_isObject(this.settings[key])) {
      throw new Error(`No such setting ${key}`)
    }

    // Notify w/ null prior to delete
    this.settings[key].value = null
    this.notifyListeners(key)
    delete this.settings[key]
  }

  clearSettings () {
    _keys(this.settings).forEach((key) => {
      this.settings[key].value = null
      this.notifyListeners(key)
      delete this.settings[key]
    })
  }
}

module.exports = SettingsPlugin
