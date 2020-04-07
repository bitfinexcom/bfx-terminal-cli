'use strict'

const colors = require('colors')
const blessedContrib = require('blessed-contrib')
const _reverse = require('lodash/reverse')
const _isEmpty = require('lodash/isEmpty')
const { preparePrice } = require('bfx-api-node-util')
const Widget = require('./widget')

class OrderBookWidget extends Widget {
  constructor (host, { geo }) {
    super('order-book', {
      geo,
      host,
      element: blessedContrib.table,
      elementOptions: {
        style: { border: { fg: 'gray' } },
        label: 'Order Book',
        columnSpacing: 2,
        columnWidth: [8, 20, 10],
        interactive: false,
        fg: 'white'
      },

      requiredModules: [
        'plugin:data:order-books'
      ],

      hooks: {
        dataOrderBook: 'onOrderBook'
      }
    })
  }

  onOrderBook ({ orderBook }) {
    if (_isEmpty(orderBook)) {
      return
    }

    const data = []
    const maxRows = (this.getElement().height - 1) / 2
    const maxSideLength = Math.floor(maxRows)

    data.push(..._reverse(orderBook.asks).slice(0, maxSideLength))
    data.push(...orderBook.bids.slice(0, maxSideLength))

    this.setLabel({
      text: `Order Book (Spread ${preparePrice(orderBook.spread())})`
    })

    this.getElement().setData({
      headers: ['Count', 'Amount', 'Price'],
      data: data.map(row => {
        const cl = row[2] < 0 ? colors.red : colors.green
        return [
          cl(row[1]),
          cl(row[2]),
          cl(row[0])
        ]
      })
    })

    this.render()
  }
}

module.exports = OrderBookWidget
