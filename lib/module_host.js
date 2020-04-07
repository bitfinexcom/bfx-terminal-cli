'use strict'

const _uniq = require('lodash/uniq')
const _values = require('lodash/values')
const _flatten = require('lodash/flatten')
const _isEmpty = require('lodash/isEmpty')
const _includes = require('lodash/includes')
const AsyncEventEmitter = require('./async_event_emitter')
const ModuleAddError = require('./errors/module_add_error')
const ModuleHostBootError = require('./errors/module_host_boot_error')
const ModuleHostValidationError = require('./errors/module_host_validation_error')
const ErrorHandlerSelfTestError = require('./errors/error_handler_self_test')

/**
 * Host for a set of plugin & widget modules. Validates module requirements
 * upon add and host boot
 *
 * @extends AsyncEventEmitter
 */
class ModuleHost extends AsyncEventEmitter {
  /**
   * Create new module host; initialized with empty modules array
   *
   * @todo refactor out terminal requirement (move screen into own module)
   *
   * @param {Terminal} terminal - terminal instance
   */
  constructor (terminal) {
    super()

    this.modules = []
    this.terminal = terminal
    this.booted = false
  }

  /**
   * @returns {Terminal} terminal - terminal instance
   */
  getTerminal () {
    return this.terminal
  }

  /**
   * @returns {boolean} isBooted - if true, modules are initialized and running
   */
  isBooted () {
    return this.booted
  }

  /**
   * Returns a list of all hooks provided by currently loaded modules
   *
   * @returns {string[]} hooks
   */
  getModuleProvidedHooks () {
    return _flatten(this.modules.map(m => m.getProvidedHooks()))
  }

  /**
   * Returns a list of unique provided hooks, including currently loaded
   * modules, the host hooks, and optionally any hooks provided as an argument.
   *
   * @returns {string[]} hooks
   */
  getAllProvidedHooks () {
    const moduleProvidedHooks = this.getModuleProvidedHooks()
    const hostHooks = _values(ModuleHost.HOST_PROVIDED_HOOKS)

    return _uniq(_flatten([hostHooks, moduleProvidedHooks]))
  }

  /**
   * Returns a list of all loaded module IDs
   *
   * @returns {string[]} ids
   */
  getAllModuleIDs () {
    return this.modules.map(m => m.getID())
  }

  /**
   * Add a module to the internal set; can only be done prior to
   * {@link ModuleHost#boot} call. Only module uniqueness is checked;
   * requirements are validated on {@link ModuleHost#boot} call.
   *
   * @throws {ModuleAddError} fails if module is flagged `unique` but already
   *   present in module list, or the host already booted
   *
   * @param {Class} ModuleClass - module to be added
   * @param {object} [moduleArgs] - module arguments
   */
  addModule (ModuleClass, moduleArgs) {
    if (this.isBooted()) {
      throw new ModuleAddError('Module host already booted')
    }

    const module = new ModuleClass(this, moduleArgs || {})
    const unique = module.isUnique()
    const id = module.getID()

    if (unique && this.modules.find(m => m.getID() === id)) {
      throw new ModuleAddError(`Module unique but already present: ${id}`)
    }

    this.modules.push(module)
  }

  /**
   * Ensures host has all modules required to run
   *
   * @throws {ModuleHostValidationError} fails if required host module missing
   *   from module set
   */
  validateHostRequirements () {
    const hostRequiredModules = _values(ModuleHost.HOST_REQUIRED_MODULES)
    const allIDs = this.getAllModuleIDs()

    hostRequiredModules.forEach((moduleID) => {
      if (!_includes(allIDs, moduleID)) {
        throw new ModuleHostValidationError(
          `Module required by host missing ${moduleID}`
        )
      }
    })
  }

  /**
   * Ensures all modules on internal set have their requirements met
   *
   * @throws {ModuleHostValidationError} fails if a module is missing a
   *   dependency (hook or other module)
   */
  validateModuleRequirements () {
    const allHooks = this.getAllProvidedHooks()
    const allIDs = this.getAllModuleIDs()

    this.modules.forEach((module) => {
      const requiredModules = module.getRequiredModules()
      const requiredHooks = module.getRequiredHooks()
      const id = module.getID()

      requiredHooks.forEach((name) => {
        if (!_includes(allHooks, name)) {
          throw new ModuleHostValidationError([
            `Module ${id} requires missing hook ${name} but not provided by`,
            'any module'
          ].join(' '))
        }
      })

      requiredModules.forEach((requiredID) => {
        if (!_includes(allIDs, requiredID)) {
          throw new ModuleHostValidationError(
            `Module ${id} requires module ${requiredID} but not loaded`
          )
        }
      })
    })
  }

  /**
   * Validates host & module requirements. If successful, tests the `hostError`
   * event to ensure it does not fail, and triggers module boot.
   *
   * @fires ModuleHost~hostBoot
   * @async
   */
  async boot () {
    if (this.isBooted()) {
      throw new ModuleHostBootError('Module host already booted')
    }

    this.validateHostRequirements()
    this.validateModuleRequirements()

    // Ensure fallback error handler does not fail itself

    /**
     * Fallback error event
     *
     * @event ModuleHost~hostError
     * @property {Error} error - error object
     */
    await this.emit('hostError', { error: new ErrorHandlerSelfTestError() })
    await (this.logDuration('module boot', false)(async () => {
      /**
       * Init hook for modules
       *
       * @event ModuleHost~hostBoot
       */
      return this.emit('hostBoot')
    }))

    this.booted = true
  }

  /**
   * Get the loaded module set
   *
   * @returns {Module[]} modules
   */
  getModules () {
    return this.modules
  }

  /**
   * Return all loaded command modules
   *
   * @returns {Command[]} commands
   */
  getCommands () {
    return this.modules.filter(m => m.getID().split(':')[0] === 'command')
  }

  /**
   * Returns a list of all methods added to the host by modules, mapped to
   * their parent module ID & type ('method' or 'asyncMethod')
   *
   * @returns {object} hostMethods
   */
  getModuleHostMethods () {
    const methods = {}

    this.modules.forEach((m) => {
      const id = m.getID()
      const hostMethods = m.getHostMethods()
      const asyncHostMethods = m.getAsyncHostMethods()

      hostMethods.forEach((name) => {
        if (!_isEmpty(methods[name])) {
          throw new Error(
            `Duplicate host method ${name} from module ${id} passed validation!`
          )
        }

        methods[name] = {
          type: 'method',
          id
        }
      })

      asyncHostMethods.forEach((name) => {
        if (!_isEmpty(methods[name])) {
          throw new Error(
            `Duplicate host method ${name} from module ${id} passed validation!`
          )
        }

        methods[name] = {
          type: 'asyncMethod',
          id
        }
      })
    })

    return methods
  }
}

/**
 * Map of hooks implemented (emitted) by the host itself.
 *
 * @property {string} HOST_ERROR - fallback error hook used when module host
 *   environment is either not ready or already failed to handle an error
 * @property {string} HOST_BOOT - hook triggered once the module host is deemed
 *   complete, and execution may begin. Plugins should use this hook to start
 *   up.
 */
ModuleHost.HOST_PROVIDED_HOOKS = {
  HOST_ERROR: 'hostError',
  HOST_BOOT: 'hostBoot'
}

/**
 * Map of minimum modules required by a host to execute; currently limited to
 * the logging and utility modules to handle boot.
 *
 * @property {string} CORE_LOGGER - {@link CoreLoggerPlugin}
 * @property {string} CORE_UTILITIES - {@link CoreUtilitiesPlugin}
 */
ModuleHost.HOST_REQUIRED_MODULES = {
  CORE_LOGGER: 'plugin:core:logger',
  CORE_UTILITIES: 'plugin:core:utilities'
}

module.exports = ModuleHost
