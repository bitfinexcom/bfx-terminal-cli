'use strict'

const { preparePrice } = require('bfx-api-node-util')

const formatPrice = price => preparePrice(price)

module.exports = formatPrice
