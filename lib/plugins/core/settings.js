'use strict'

const _isUndefined = require('lodash/isUndefined')
const _isFunction = require('lodash/isFunction')
const _isString = require('lodash/isString')
const _isObject = require('lodash/isObject')
const _includes = require('lodash/includes')
const _isEmpty = require('lodash/isEmpty')
const _isArray = require('lodash/isArray')
const _keys = require('lodash/keys')

const Plugin = require('../plugin')

/**
 * Setting definition, providing validation/transform logic
 *
 * @typedef {object} SettingDefinition
 * @property {string} key - setting key, must include namspace seperated by '.'
 * @property {string} description - setting description, shown to user when
 *   querying setting information
 * @property {Function} [validate] - validation function which must return true
 *   if the setting is valid; if false, an error is thrown when trying to
 *   update the setting
 * @property {Function} [transform] - function which is used to transform
 *   setting prior to validtion and saving
 * @property {any[]} [choices] - array of valid choices, checked after validation
 *   function if provided
 */

/**
 * Provides a set of terminal methods for managing arbitrary settings. Settings
 * are intended to be shared between all modules on a {@link ModuleHost}, and
 * provide a way for plugins & widgets to be configured after creation.
 */
class SettingsPlugin extends Plugin {
  /**
   * @param {Terminal} terminal - terminal instance
   */
  constructor (terminal) {
    super('core:settings', {
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

  /**
   * Retrieve a list of setting keys, optionally filtered by namespace.
   * Bound to terminal instance.
   *
   * @param {string} namespace - key namespace (first token prior to '.')
   * @return {string[]} keys
   */
  listSettings (namespace) {
    const allKeys = _keys(this.settings)

    return namespace
      ? allKeys
        .map(k => k.split('.'))
        .filter(k => k[0] === namespace)
      : allKeys
  }

  /**
   * Retrieve a setting value by key
   *
   * @param {string} key - setting key
   * @returns {*|undefined} value
   */
  getSetting (key) {
    const setting = this.settings[key]

    return _isObject(setting)
      ? setting.value
      : undefined
  }

  /**
   * Update a setting with a value which will be validated and transformed
   * prior to save. Notifies all setting listeners of the change.
   *
   * @throws {Error} fails if setting key is unknown or value fails validation
   *
   * @param {string} key - setting key
   * @param {*} rawValue - value to be validated and transformed
   */
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

  /**
   * Returns a validation error for the specified setting definition, or null
   * if it is valid.
   *
   * @param {SettingDefinition} setting
   * @returns {string|null} validationErrorMessage - null if valid
   */
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

  /**
   * Define a new setting
   *
   * @throws {Error} fails if the definition fails validation or the setting
   *   key already exists
   *
   * @param {SettingDefinition} definition
   */
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

  /**
   * Add a listener to a setting by key
   *
   * @throws {Error} fails if no setting exists for the key
   *
   * @param {string} key - setting key
   * @param {Function} listener - listener, not checked for uniqueness
   */
  subscribeSetting (key, listener) {
    const setting = this.settings[key]

    if (!_isObject(setting)) {
      throw new Error(`No such setting ${key}`)
    }

    setting.listeners.push(listener)
  }

  /**
   * Remove a listener from a setting by key if found
   *
   * @throws {Error} fails if no setting exists for the key
   *
   * @param {string} key - setting key
   * @param {Function} listener - listener
   */
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

  /**
   * Notify all listeners for the specified setting with the current setting
   * value
   *
   * @throws {Error} fails if no setting exists for the key
   *
   * @param {string} key - setting key
   */
  notifyListeners (key) {
    const setting = this.settings[key]

    if (!_isObject(setting)) {
      throw new Error(`No such setting ${key}`)
    }

    const { listeners, value } = setting

    listeners.forEach(l => l(value))
  }

  /**
   * Remove a setting definition by key. Listeners are notified with `null`
   *
   * @throws {Error} fails if no setting exists for the key
   *
   * @param {string} key - setting key
   */
  removeSetting (key) {
    if (!_isObject(this.settings[key])) {
      throw new Error(`No such setting ${key}`)
    }

    // Notify w/ null prior to delete
    this.settings[key].value = null
    this.notifyListeners(key)
    delete this.settings[key]
  }

  /**
   * Clear all settings. Listeners are notified with `null`
   */
  clearSettings () {
    _keys(this.settings).forEach((key) => {
      this.settings[key].value = null
      this.notifyListeners(key)
      delete this.settings[key]
    })
  }
}

module.exports = SettingsPlugin
