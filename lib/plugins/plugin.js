'use strict'

const TerminalModule = require('../terminal_module')

require('../types/terminal_module_definition')

/**
 * Base class for Terminal plugins; plugins are meant to implement custom
 * events and data processing, and are marked as unique by default.
 *
 * @extends TerminalModule
 */
class Plugin extends TerminalModule {
  /**
   * Prefixes the provided ID with `plugin:`
   *
   * @param {string} id - plugin ID
   * @param {TerminalModuleDefinition} options - passed to
   *   {@link TerminalModule}
   */
  constructor (id, options) {
    super(`plugin:${id}`, {
      unique: true,
      ...options
    })
  }
}

module.exports = Plugin
