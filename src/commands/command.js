'use strict'

const colors = require('colors')
const Module = require('../module')

require('../types/module_definition')
require('../types/command_yargs_definition')

/**
 * Base class for Terminal commands; commands provide a yArgs parser and
 * handler for execution. They are marked as `unique` by default.
 *
 * @extends Module
 */
class Command extends Module {
  /**
   * Prefixes the provided ID with `command:`
   *
   * @param {string} id - command ID
   * @param {ModuleDefinition} definition - definition
   */
  constructor (id, definition) {
    super(`command:${id}`, definition)
  }

  /**
   * Base method which must be overriden by command classes; needs to be
   * provide the yargs definition to be parsed by {@link Command.getYArgs}
   *
   * @throws {Error} fails if called directly
   * @private
   */
  getYArgsDefinition () {
    throw new Error('Commands must override getYArgsDefinition()')
  }

  /**
   * Base method which must be overriden by command classes; needs to be
   * provide the command execution handler.
   *
   * @throws {Error} fails if called directly
   * @private
   * @async
   */
  async handler () {
    throw new Error('Commands must override handler()')
  }

  /**
   * Attaches the command to a yArgs instance using the class yargs definition
   *
   * @param {yArgs} y - yArgs instance
   * @returns {yArgs} y - same yargs instance after `y.command()` call
   */
  attachYArgs (y) {
    const {
      command,
      epilogue,
      description,
      extra = {},
      options = {},
      aliases = [],
      examples = []
    } = this.getYArgsDefinition()

    return y.command({
      command,
      aliases,
      handler: this.handler.bind(this),
      describe: colors.green(description),
      builder: yArgs => {
        Object.keys(options).forEach((flag) => {
          const opt = options[flag]

          yArgs.option(flag, {
            ...opt,
            ...(opt.describe ? {
              describe: colors.yellow(opt.describe)
            } : {})
          })
        })

        examples.forEach(([content, ...description]) => {
          yArgs.example(colors.blue(content), colors.yellow(description.join(' ')))
        })

        if (epilogue) {
          yArgs.epilogue(epilogue)
        }

        Object.keys(extra).forEach((func) => {
          yArgs[func](extra[func])
        })
      }
    })
  }
}

module.exports = Command
