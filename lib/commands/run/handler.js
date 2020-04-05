'use strict'

const Promise = require('bluebird')
const _isEmpty = require('lodash/isEmpty')
const _includes = require('lodash/includes')
const { SYMBOLS } = require('bfx-hf-util')
const Terminal = require('../../terminal')

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

  const t = new Terminal({
    apiKey: API_KEY,
    apiSecret: API_SECRET,
    symbol: market
  })

  return new Promise((resolve, reject) => {
    setTimeout(() => { // give terminal modules time to setup
      t.connect().then(resolve).catch(reject)
    })
  })
}

module.exports = handler
