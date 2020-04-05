'use strict'

require('colors')

const _uniq = require('lodash/uniq')
const _keys = require('lodash/keys')
const _forEach = require('lodash/forEach')
const _isEmpty = require('lodash/isEmpty')
const _isFunction = require('lodash/isFunction')
const _isUndefined = require('lodash/isUndefined')
const validateHooks = require('./validation/hooks')
const validateMultiple = require('./validate_multiple')
const validateTerminalModuleID = require('./validation/terminal_module_id')

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
   * @param {object} definition - module definition
   * @param {Terminal} terminal - terminal instance to bind to
   * @param {boolean} [unique] - if true, only 1 instance of the module is
   *   allowed on the terminal
   * @param {object|Function} [hooks] - definition of hooks which the module
   *   consumes (hook names mapped to module method names)
   * @param {string[]} [terminalMethods] - array of module method names which
   *   need to be attached to the terminal instance. Requires `unique` set
   *   to true.
   * @param {string[]} [providedHooks] - array of hook names provided (emitted)
   *   by this module
   * @param {string[]} [requiredHooks] - array of hooks used (not necessarily
   *   consumed) by this module; Combined with `hooks` entries for the final
   *   list
   * @param {string[]} [requiredModules] - array of module IDs required for
   *   this module to operate
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
        terminal[name] = (...args) => {
          return this[name](...args)
        }
      })
    }

    if (!_isEmpty(hooks)) {
      _forEach(hooks, (handler, name) => {
        terminal.on(name, (...data) => {
          this[handler](...data)
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

  render () {
    this.terminal.render()
  }

  on (eventName, handler) {
    this.terminal.on(eventName, handler.bind(this))
  }

  emit (eventName, data) {
    this.terminal.emit(eventName, data)
  }
}

module.exports = TerminalModule
