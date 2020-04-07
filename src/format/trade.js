'use strict'

const colors = require('colors')

// NOTE: no price/amount formatting is performed as original precision is
// relevant
const formatTrade = ({ price, amount }) => (
  `${amount < 0 ? colors.red(amount) : colors.green(amount)} @ ${price}`
)

module.exports = formatTrade
