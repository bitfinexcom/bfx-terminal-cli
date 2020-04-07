'use strict'

const AsyncEventEmitter = require('./async_event_emitter')

/**
 * Host for a set of plugin & widget modules. Validates module requirements
 * upon add and host boot
 *
 * @todo migrate logic from {@link class:Terminal}
 */
class ModuleHost extends AsyncEventEmitter {}

module.exports = ModuleHost
