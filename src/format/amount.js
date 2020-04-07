'use strict'

const colors = require('colors')
const { prepareAmount } = require('bfx-api-node-util')

const formatAmount = amount => amount < 0
  ? colors.red(prepareAmount(amount))
  : colors.green(prepareAmount(amount))

module.exports = formatAmount
