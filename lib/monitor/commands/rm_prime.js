'use strict'

const _isFinite = require('lodash/isFinite')

const rmPrimeCommand = (monitor, l) => ({
  matcher: new RegExp(/^(rm-prime|del-prime|rmprime|rp|delprime|dp)( *)(.*)$/),
  help: {
    command: 'rm-prime [id]',
    description: 'Remove a prime rule by ID',
    aliases: ['del-prime', 'rmprime', 'rp', 'delprime', 'dp']
  },

  handler: async (matches) => {
    const [,, _id] = matches
    const id = +_id

    if (!_isFinite(id)) {
      throw new Error(`Given invalid prime ID: ${_id}`)
    }

    if (monitor.deletePrime(id)) {
      l('Deleted prime rule %d', id)
    } else {
      l('No such prime rule: %d', id)
    }
  }
})

module.exports = rmPrimeCommand
