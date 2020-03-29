'use strict'

const colors = require('colors')
const _isEmpty = require('lodash/isEmpty')
const _isFinite = require('lodash/isFinite')
const defineCommandYargs = require('../util/define_command_yargs')

const TYPE_LIST = ['size', 'group-size', 'price-indicator']
const TYPES = {}

const TIF_UNITS_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000
}

TYPE_LIST.forEach(t => { TYPES[t] = t })

const primeCommand = (monitor, l) => y => defineCommandYargs(y, {
  command: 'prime <type> <threshold|indicator> [amount|tif] [tif]',
  description: (
    'Add a prime rule; prime rules trigger orders when conditions are met'
  ),

  epilogue: [
    'Multiple rules can be specified, but when one prime rule is triggered,',
    'all others are cancelled.'
  ].join(' ').cyan,

  options: {
    type: {
      alias: 't',
      describe: 'Rule type',
      choices: TYPE_LIST,
      demandOption: true
    },

    threshold: {
      alias: 'v',
      describe: 'Rule threshold, literal value to be exceeded, direction based on sign',
      type: 'number'
    },

    indicator: {
      alias: 'i',
      describe: 'Indicator name and arguments for indicator rule, i.e. EMA(30) or RSI(14)',
      type: 'string'
    },

    amount: {
      alias: 'a',
      describe: 'Created order amount, defaults to quick order size',
      type: 'number'
    },

    tif: {
      describe: 'Time-in-force, numeric with suffix \'s\', \'m\', or \'h\'',
      type: 'string'
    }
  },

  examples: [[
    'prime size 1',
    'Execute quick buy when a buy trade with size larger than 1 is seen'
  ], [
    'prime group-size 3 0.2 20s',
    'Execute quick buy for 0.2 when the last buy group amount exceeds 3,',
    'rule valid for 20 seconds'
  ], [
    'prime indicator ema(30) 0.2 1m',
    'Execute quick buy for 0.2 when the price crosses the EMA with period',
    '30, rule valid for 1 minute'
  ]],

  extra: {
    check: (argv) => {
      const { threshold, indicator } = argv

      if (!_isFinite(threshold) && _isEmpty(indicator)) {
        throw new Error('Either threshold or indicator required')
      }

      return true
    }
  },

  handler: (argv) => {
    const { type, threshold, amount, tif: _tif } = argv
    const tifUnit = _tif ? TIF_UNITS_MS[_tif.slice(-1)] : null
    const tifDuration = _tif ? +_tif.slice(0, _tif.length - 1) : null

    if (!_isFinite(tifUnit) && !_isEmpty(_tif)) {
      throw new Error(`Unknown TIF unit: ${tifUnit}`)
    }

    if (!_isFinite(tifDuration) && !_isEmpty(_tif)) {
      throw new Error(`TIF duration not a number: ${_tif}`)
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
