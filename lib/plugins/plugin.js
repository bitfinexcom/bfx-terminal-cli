'use strict'

const Module = require('../module')

require('../types/module_definition')

/**
 * Base class for Terminal plugins; plugins are meant to implement custom
 * events and data processing, and are marked as unique by default.
 *
 * @extends Module
 */
class Plugin extends Module {
  /**
   * Prefixes the provided ID with `plugin:`
   *
   * @param {string} id - plugin ID
   * @param {ModuleDefinition} options - passed to {@link Module}
   */
  constructor (id, options) {
    super(`plugin:${id}`, {
      unique: true,
      ...options
    })
  }
}

module.exports = Plugin
