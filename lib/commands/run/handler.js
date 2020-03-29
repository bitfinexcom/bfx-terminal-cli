'use strict'

const _includes = require('lodash/includes')
const _isEmpty = require('lodash/isEmpty')
const { SYMBOLS } = require('bfx-hf-util')
const Monitor = require('../../monitor')

const VALID_SYMBOLS = Object.values(SYMBOLS)
const { API_KEY, API_SECRET } = process.env

const handler = async (argv) => {
  const { market } = argv

  if (!_includes(VALID_SYMBOLS, market)) {
    throw new Error(`Given invalid market symbol: ${market}`)
  }

  if (_isEmpty(API_KEY) || _isEmpty(API_SECRET)) {
    throw new Error('API_KEY and API_SECRET not on env or in .env file')
  }

  const m = new Monitor({
    apiKey: API_KEY,
    apiSecret: API_SECRET
  })

  return m.connect(market)
}

module.exports = handler
