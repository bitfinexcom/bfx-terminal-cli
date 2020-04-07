'use strict'

/**
 * A module definition, providing information on dependencies and implemented
 * methods, hooks, and host methods.
 *
 * @typedef {object} ModuleDefinition
 * @property {ModuleHost} host - module host instance to bind to
 * @property {boolean} [unique] - if true, only 1 instance of the module is
 *   allowed on the host
 * @property {object|Function} [hooks] - definition of hooks which the module
 *   consumes (hook names mapped to module method names)
 * @property {string[]} [hostMethods] - array of module method names which
 *   need to be attached to the host instance. Requires `unique` set to true
 * @property {string[]} [asyncHostMethods] like `hostMethods` but listing
 *   module methods which are async
 * @property {string[]} [providedHooks] - array of hook names provided (emitted)
 *   by this module
 * @property {string[]} [requiredHooks] - array of hooks used (not necessarily
 *   consumed) by this module; Combined with `hooks` entries for the final
 *   list
 * @property {string[]} [requiredModules] - array of module IDs required for
 *   this module to operate
 */
