'use strict'

require('colors')

const _uniq = require('lodash/uniq')
const _keys = require('lodash/keys')
const _forEach = require('lodash/forEach')
const _isEmpty = require('lodash/isEmpty')
const _isObject = require('lodash/isObject')
const _isFunction = require('lodash/isFunction')
const _isUndefined = require('lodash/isUndefined')
const validateHooks = require('./validation/hooks')
const validateMultiple = require('./validate_multiple')
const validateTerminalModuleID = require('./validation/terminal_module_id')

require('./types/module_definition')

/**
 * Base class for all modules (widgets, plugins). Provides basic validation and
 * host access/integration methods
 */
class Module {
  /**
   * Creates a new module; provides metadata for the host terminal to validate
   * that the module has everything is needs to operate.
   *
   * @todo refactor out Terminal, should not be needed
   *
   * @param {string} id - module ID, delimited by colon
   * @param {ModuleDefinition} definition - module definition
   */
  constructor (id, {
    host, hostMethods, hooks, providedHooks, requiredHooks, unique,
    requiredModules, asyncHostMethods
  }) {
    validateMultiple(id, [
      [validateTerminalModuleID, id],
      [validateHooks, hooks]
    ])

    this.id = id
    this.unique = unique
    this.host = host
    this.terminal = host.getTerminal()
    this.requiredModules = requiredModules || []
    this.providedHooks = providedHooks || []
    this.requiredHooks = _uniq([
      ...(requiredHooks || []),
      ..._keys(hooks || {})
    ])

    // TODO: Refactor/dedup
    if (!_isEmpty(hostMethods) || !_isEmpty(asyncHostMethods)) {
      if (!unique) {
        throw new Error(
          'Module includes host methods but not explicity flagged unique'
        )
      }

      if (!_isEmpty(hostMethods)) {
        hostMethods.forEach((name) => {
          if (!_isUndefined(host[name])) {
            throw new Error(`Module host method would clobber ${name}`)
          }

          host[name] = (...args) => {
            if (!_isFunction(this[name])) {
              throw new Error(
                `Module ${id} provides non-existent host method ${name}`
              )
            } else {
              return this[name](...args)
            }
          }
        })
      }

      if (!_isEmpty(asyncHostMethods)) {
        asyncHostMethods.forEach((name) => {
          if (!_isUndefined(host[name])) {
            throw new Error(`Module host method would clobber ${name}`)
          }

          host[name] = async (...args) => {
            if (!_isFunction(this[name])) {
              throw new Error(
                `Module ${id} provides non-existent host method ${name}`
              )
            } else {
              return this[name](...args)
            }
          }
        })
      }
    }

    if (!_isEmpty(hooks)) {
      _forEach(hooks, (handler, name) => {
        host.on(name, async (...data) => {
          try {
            if (!_isFunction(this[handler])) {
              throw new Error(
                `Module ${id} provides non-existent hook handler ${handler}`
              )
            }

            await this[handler](...data)
          } catch (error) {
            host.emit('hostError', { error })
          }
        })
      })
    }
  }

  /**
   * Query uniqueness flag; if unique, only one module of the type is allowed
   * on a single {@link ModuleHost}
   *
   * @returns {boolean} unique
   */
  isUnique () {
    return this.unique
  }

  /**
   * Fetch the list of module IDs required by this module
   *
   * @returns {string[]} requiredIDs
   */
  getRequiredModules () {
    return this.requiredModules
  }

  /**
   * Fetch the list of hook names required by this module
   *
   * @returns {string[]} requiredHooks
   */
  getRequiredHooks () {
    return this.requiredHooks
  }

  /**
   * Fetch the list of hooks provided (originally emitted) by this module
   *
   * @returns {string[]} providedHooks
   */
  getProvidedHooks () {
    return this.providedHooks
  }

  /**
   * Get the module's ID; namespace/identifers seperated by colon ':'
   *
   * @returns {string} id
   */
  getID () {
    return this.id
  }

  /**
   * Like {@link TerminalModule#getID} but colors the namespace blue and the
   * other tokens green
   *
   * @returns {string} coloredID
   */
  getColoredID () {
    const tokens = this.id.split(':')
    return `${tokens[0].blue}:${tokens.slice(1).join(':').green}`
  }

  /**
   * Returns the underlying host terminal instance
   *
   * @todo Refactor out in leu of {@link ModuleHost}
   *
   * @returns {Terminal} terminal
   */
  getTerminal () {
    return this.terminal
  }

  /**
   * Returns the module host isntance
   *
   * @returns {ModuleHost} host
   */
  getHost () {
    return this.host
  }

  /**
   * Returns the underlying host terminal's active symbol
   *
   * @todo Refactor out, configure all plugins with symbols on creation
   *
   * @returns {string} symbol
   */
  getSymbol () {
    return this.terminal.getSymbol()
  }

  /**
   * Shorthand for {@link Terminal#render}
   *
   * @see Terminal#render
   */
  render () {
    this.terminal.render()
  }

  /**
   * Binds an event handler on the host
   *
   * @param {string} eventName - event name
   * @param {Function} handler - event listener, bound to `this`
   */
  on (eventName, handler) {
    this.host.on(eventName, handler.bind(this))
  }

  /**
   * Emits an event on the host
   *
   * @throws {Error} fails if data is present and not an object
   * @async
   *
   * @param {string} eventName - event name
   * @param {object} [data] - event payload
   * @returns {Promise} p - resolves on emit end (all listeners called)
   */
  async emit (eventName, data) {
    if (!_isEmpty(data) && !_isObject(data)) {
      throw new Error(
        `Module event payload must be an object if present [${eventName}]`
      )
    }

    return this.host.emit(eventName, data)
  }

  /**
   * Helper to provide standardised error handling if emitting from a non-async
   * context; passes errors to the fallback hostError event. If that fails,
   * no logging can be done as blessed clears the screen on unhandled
   * exceptions.
   *
   * @private
   *
   * @param {string} eventName - event name
   * @param {object} data - event data
   */
  emitSync (eventName, data) {
    this.emit(eventName, data).catch((error) => {
      this.emit('hostError', { error })
    })
  }

  /**
   * Shorthand for {@link CoreUtilitiesPlugin#logDuration} (required module on
   * host)
   *
   * @see ModuleHost#logDuration
   *
   * @param {...any} args - passed to {@link ModuleHost.logDurlogDuration}
   * @returns {Function} exec
   */
  logDuration (...args) {
    return this.host.logDuration(...args)
  }
}

module.exports = Module
