'use strict'

require('colors')

const _uniq = require('lodash/uniq')
const _keys = require('lodash/keys')
const _forEach = require('lodash/forEach')
const _isFunction = require('lodash/isFunction')
const _isUndefined = require('lodash/isUndefined')
const validateHooks = require('./validation/hooks')
const validateMethods = require('./validation/methods')
const validateMultiple = require('./validate_multiple')
const validateTerminalModuleID = require('./validation/terminal_module_id')

/**
 * Base class for all terminal modules (widgets, plugins). Provides basic
 * validation and terminal access/integration methods
 */
class TerminalModule {
  constructor (id, {
    terminal, terminalMethods, hooks, providedHooks, requiredHooks, unique
  }) {
    validateMultiple(id, [
      [validateTerminalModuleID, id],
      [validateMethods, terminalMethods],
      [validateHooks, hooks]
    ])

    this.id = id
    this.unique = unique
    this.terminal = terminal
    this.providedHooks = providedHooks
    this.requiredHooks = _uniq([
      ...(requiredHooks || []),
      ..._keys(hooks || {})
    ])

    if (terminalMethods) {
      if (!unique) {
        throw new Error([
          'Terminal module includes terminal methods but not explicity flagged',
          'unique'
        ].join(' '))
      }

      setTimeout(() => { // await this
        const methods = _isFunction(terminalMethods)
          ? terminalMethods(this)
          : terminalMethods

        _forEach(methods, (method, name) => {
          if (!_isUndefined(terminal[name])) {
            throw new Error(`Module terminal method would clobber ${method}`)
          }

          // Support both functions and objects (i.e. signale logger object)
          terminal[name] = _isFunction(method)
            ? method.bind(this)
            : method
        })
      })
    }

    if (hooks) {
      setTimeout(() => { // await this
        const h = _isFunction(hooks)
          ? hooks(this)
          : hooks

        _forEach(h, (handler, name) => {
          this.on(name, this[handler])
        })
      })
    }
  }

  isUnique () {
    return this.unique
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
