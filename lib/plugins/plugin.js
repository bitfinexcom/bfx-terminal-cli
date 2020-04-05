'use strict'

const TerminalModule = require('../terminal_module')

/**
 * Base class for Terminal plugins; plugins are meant to implement custom
 * events and data processing, and are marked as unique by default.
 */
class Plugin extends TerminalModule {
  constructor (id, options) {
    super(`plugin:${id}`, {
      unique: true,
      ...options
    })
  }
}

module.exports = Plugin
