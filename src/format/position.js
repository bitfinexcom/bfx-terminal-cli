'use strict'

const colors = require('colors')
const { prepareAmount, preparePrice } = require('bfx-api-node-util')

const formatPosition = (position = {}) => {
  const { basePrice, amount, pl, plPerc, liquidationPrice } = position
  const clBG = a => a < 0 ? colors.bgRed.black : colors.bgGreen.black
  const clFG = a => a < 0 ? colors.red : colors.green

  return [
    clBG(+amount)(prepareAmount(amount)),
    '@',
    preparePrice(basePrice),
    clFG(+pl)(`(P/L ${prepareAmount(pl)} [${(plPerc * 100).toFixed(2)}%])`),
    `[liq ${preparePrice(liquidationPrice)}]`
  ].join(' ')
}

module.exports = formatPosition
