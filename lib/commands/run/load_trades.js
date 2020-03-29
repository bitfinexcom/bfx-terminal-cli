'use strict'

const fs = require('fs')
const signale = require('signale')

const loadTrades = (filename) => {
  signale.info('loading trades from %s', filename)

  const tradeJSON = fs.readFileSync(filename, 'utf-8')
  const trades = JSON.parse(tradeJSON)

  signale.success('read %d trades from seed file', trades.length)

  for (let i = 0; i < trades.length - 1; i += 1) {
    if (trades[i].mts > trades[i + 1].mts) {
      throw new Error(`bad trade order (trade ${i} older than next)`)
    }
  }

  signale.success('trade sort OK')

  return trades
}

module.exports = loadTrades
