'us strict'

const _isEmpty = require('lodash/isEmpty')
const defineCommandYargs = require('../util/define_command_yargs')

const rmPrimeCommand = (monitor, l) => y => {
  const ids = monitor.getPrimeIDs()

  return defineCommandYargs(y, {
    command: 'rm-prime <id>',
    description: 'Remove a prime rule by ID',
    aliases: ['del-prime', 'rmprime', 'rp', 'delprime', 'dp'],

    options: {
      id: {
        type: 'number',
        describe: 'ID of prime rule to remove',
        required: true,

        ...(_isEmpty(ids) ? {} : { choices: ids })
      }
    },

    handler: async (argv) => {
      const { id } = argv

      if (monitor.deletePrime(id)) {
        l('Deleted prime rule %d', id)
      } else {
        l('No such prime rule: %d', id)
      }
    }
  })
}

module.exports = rmPrimeCommand
