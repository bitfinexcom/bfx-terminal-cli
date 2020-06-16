'use strict'

const { Order } = require('bfx-api-node-models')
const Command = require('../command')

require('../../types/command_yargs_definition')

/**
 * Allows executing a market buy order with either quick order size or custom
 * size
 *
 * @extends Command
 */
class BuyCommand extends Command {
  /**
   * @param {ModuleHost} host - host instance
   */
  constructor (host) {
    super('orders:buy', {
      host,
      requiredModules: [
        'plugin:core:logger',
        'plugin:data:orders'
      ]
    })
  }

  /**
   * @private
   * @returns {CommandYargsDefinition} definition
   */
  getYArgsDefinition () {
    return {
      command: 'buy [size]',
      description: 'Execute a MARKET buy; quick order size used by default',
      aliases: ['b'],

      options: {
        size: {
          alias: 's',
          type: 'number',
          describe: 'Order size, defaults to quick order size',
          default: this.getHost().getQuickOrderSize()
        }
      },

      extra: {
        check: (argv) => {
          const { size } = argv

          if (size < 0) {
            throw new Error('Size must be positive')
          }
        }
      }
    }
  }

  /**
   * Generates the necessary order and submits it via the host
   *
   * @private
   * @async
   *
   * @param {object} argv - command arguments
   * @param {number} argv.size - order size
   */
  async handler (argv) {
    const { size } = argv
    const start = Date.now()
    const host = this.getHost()

    await host.submitOrder(new Order({
      symbol: this.getTerminal().getSymbol(),
      type: Order.type.MARKET,
      amount: size
    }))

    host.logOutput('Buy submitted (in %dms)'.green, Date.now() - start)
  }
}

module.exports = BuyCommand
