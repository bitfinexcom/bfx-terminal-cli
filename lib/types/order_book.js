'use strict'

/**
 * Order Book Aggregated Price Level
 *
 * @typedef {object} OrderBookAggregatePriceLevel
 * @property {number} count - number of orders at level
 * @property {number} amount - total order amount at level
 * @property {number} price - price level
 */

/**
 * Order Book Raw Price Level
 *
 * @typedef {object} OrderBookRawPriceLevel
 * @property {number} orderID - id of order
 * @property {number} amount - order amount
 * @property {number} price - order price
 */

/**
 * Order Book model
 *
 * @typedef {object} OrderBook
 * @property {OrderBookAggregatePriceLevel[]|OrderBookRawPriceLevel[]} bids
 * @property {OrderBookAggregatePriceLevel[]|OrderBookRawPriceLevel[]} asks
 */
