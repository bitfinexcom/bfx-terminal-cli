'use strict'

const colors = require('colors')
const _isEmpty = require('lodash/isEmpty')
const _isFinite = require('lodash/isFinite')

const TYPE_LIST = ['size', 'group-size', 'price-indicator']
const TYPES = {}

const TIF_UNITS_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000
}

TYPE_LIST.forEach(t => { TYPES[t] = t })

const primeCommand = (monitor, l) => ({
  matcher: new RegExp(/^prime\b([a-zA-Z]*)\b(.*)\b(.*)\b(.*)?$/),
  help: {
    command: 'prime <type> <threshold> [amount] [tif]',
    description: 'Schedule an order to be triggered when the metric type exceeds a threshold',
    examples: [
      'prime size 1',
      'prime group-size 3 0.2 20s',
      'prime price-indicator ema(30) 0.2 1m'
    ]
  },

  handler: async (matches) => {
    const [, _type, _threshold, _amount, _tif] = matches
    const type = TYPES[_type]
    const threshold = +_threshold
    const amount = !_isEmpty(_amount) && +_amount
    const tifUnit = _tif ? TIF_UNITS_MS[_tif.slice(-1)] : null
    const tifDuration = _tif ? +_tif.slice(0, _tif.length - 1) : null

    if (!type) {
      throw new Error(`Unknown prime type: ${_type}`)
    }

    if (!_isFinite(tifUnit) && !_isEmpty(_tif)) {
      throw new Error(`Unknown TIF unit: ${tifUnit}`)
    }

    if (!_isFinite(tifDuration) && !_isEmpty(_tif)) {
      throw new Error(`TIF duration not a number: ${_tif}`)
    }

    if (!_isFinite(amount) && !_isEmpty(_amount)) {
      throw new Error(`Amount not a number: ${_amount}`)
    }

    if (!_isFinite(threshold)) {
      throw new Error(`Threshold not a number: ${_threshold}`)
    }

    if (type === TYPES['group-size']) {
      throw new Error('Too tired to implement now, tomorrow')
    }

    if (type === TYPES['price-indicator']) {
      throw new Error('Generic indicator primes are unimplemented')
    }

    monitor.setupPrime({
      type,
      threshold,
      amount: _isFinite(amount) && amount,
      tif: tifUnit ? Date.now() + (tifDuration * tifUnit) : null
    })

    l(
      colors.brightBlue('Primed to trade on %s with threshold %s (amount %s, tif %s)'),
      type, threshold, _isFinite(amount) ? amount : '-',
      _isEmpty(_tif) ? '-' : _tif
    )
  }
})

module.exports = primeCommand
module.exports.TYPES = TYPES
