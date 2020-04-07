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

require('./types/terminal_module_definition')

/**
 * Base class for all terminal modules (widgets, plugins). Provides basic
 * validation and terminal access/integration methods
 */
class TerminalModule {
  /**
   * Creates a new module; provides metadata for the host terminal to validate
   * that the module has everything is needs to operate.
   *
   * @param {string} id - module ID, delimited by colon
   * @param {TerminalModuleDefinition} definition - module definition
   */
  constructor (id, {
    terminal, terminalMethods, hooks, providedHooks, requiredHooks, unique,
    requiredModules
  }) {
    validateMultiple(id, [
      [validateTerminalModuleID, id],
      [validateHooks, hooks]
    ])

    this.id = id
    this.unique = unique
    this.terminal = terminal
    this.requiredModules = requiredModules || []
    this.providedHooks = providedHooks || []
    this.requiredHooks = _uniq([
      ...(requiredHooks || []),
      ..._keys(hooks || {})
    ])

    if (!_isEmpty(terminalMethods)) {
      if (!unique) {
        throw new Error([
          'Terminal module includes terminal methods but not explicity flagged',
          'unique'
        ].join(' '))
      }

      terminalMethods.forEach((name) => {
        if (!_isUndefined(terminal[name])) {
          throw new Error(`Module terminal method would clobber ${name}`)
        }

        // Support both functions and objects (i.e. signale logger object)
        // NOTE: Errors allowed to propagate
        terminal[name] = (...args) => {
          if (!_isFunction(this[name])) {
            throw new Error(
              `Module ${id} provides non-existent terminal method ${name}`
            )
          } else {
            return this[name](...args)
          }
        }
      })
    }

    if (!_isEmpty(hooks)) {
      _forEach(hooks, (handler, name) => {
        terminal.on(name, async (...data) => {
          try {
            if (!_isFunction(this[handler])) {
              throw new Error(
                `Module ${id} provides non-existent hook handler ${handler}`
              )
            }

            await this[handler](...data)
          } catch (error) {
            terminal.emit('terminalError', { error })
          }
        })
      })
    }
  }

  isUnique () {
    return this.unique
  }

  getRequiredModules () {
    return this.requiredModules
  }

  getRequiredHooks () {
    return this.requiredHooks
  }

  getProvidedHooks () {
    return this.providedHooks
  }

  getID () {
    return this.id
  }

  getColoredID () {
    const tokens = this.id.split(':')
    return `${tokens[0].blue}:${tokens.slice(1).join(':').green}`
  }

  getTerminal () {
    return this.terminal
  }

  getWS () {
    return this.terminal.getWS()
  }

  getSymbol () {
    return this.terminal.getSymbol()
  }

  render () {
    this.terminal.render()
  }

  on (eventName, handler) {
    this.terminal.on(eventName, handler.bind(this))
  }

  async emit (eventName, data) {
    if (!_isEmpty(data) && !_isObject(data)) {
      throw new Error(
        `Module event payload must be an object if present [${eventName}]`
      )
    }

    return this.terminal.emit(eventName, data)
  }

  /**
   * Helper to provide standardised error handling if emitting from a non-async
   * context; passes errors to the fallback terminalError event. If that fails,
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
      this.emit('terminalError', { error })
    })
  }

  logDuration (...args) {
    return this.terminal.logDuration(...args)
  }
}

module.exports = TerminalModule
