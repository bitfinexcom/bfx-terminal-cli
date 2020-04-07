'use strict'

const _min = require('lodash/min')
const _values = require('lodash/values')
const _isEmpty = require('lodash/isEmpty')
const _includes = require('lodash/includes')
const { TIME_FRAMES } = require('bfx-hf-util')
const { EMA } = require('bfx-hf-indicators')

const blessedContrib = require('blessed-contrib')
const Widget = require('./widget')

const TIME_FRAME_LIST = _values(TIME_FRAMES)
const DEFAULT_WINDOW = 120
const DEFAULT_EMA_PERIOD = 30

class ChartWidget extends Widget {
  constructor (host, {
    tf,
    geo,
    window = DEFAULT_WINDOW,
    emaPeriod = DEFAULT_EMA_PERIOD
  }) {
    if (!_includes(TIME_FRAME_LIST, tf)) {
      throw new Error(`Unknown time frame: ${tf}`)
    }

    super('chart', {
      geo,
      host,
      element: blessedContrib.line,
      elementOptions: {
        wholeNumbersOnly: false,
        xPadding: 3,
        xLabelPadding: 3,
        style: {
          line: 'white',
          text: 'green',
          baseline: 'green',
          border: { fg: 'gray' }
        }
      },

      requiredModules: [
        'plugin:core:settings',
        'plugin:data:candles'
      ],

      hooks: {
        dataCandles: 'onDataCandles'
      }
    })

    this.tf = tf
    this.window = window
    this.emaPeriod = emaPeriod

    // TODO: Refactor to query candle data plugin instead, this is just a quick
    // extraction from the original terminal class
    this.candles = []

    this.updateLabel()
  }

  onDataCandles ({ symbol, tf }) {
    if (tf !== this.tf || symbol !== this.getSymbol()) {
      return
    }

    this.updateChart()
  }

  updateLabel () {
    this.setLabel({
      text: `${this.window}min Price & EMA(${this.emaPeriod})`
    })
  }

  updateChartNoData () {
    this.getElement().setData([[], []])
    this.render()
  }

  updateChart () {
    const symbol = this.getSymbol()
    const key = `trade:${this.tf}:${symbol}`
    const allCandles = this.getHost().getCandleData(key)

    if (_isEmpty(allCandles)) {
      this.updateChartNoData()
      return
    }

    const candles = allCandles.slice(-this.window)
    const timestamps = candles.map(c => c.mts)
    const x = timestamps.map(t => new Date(t).toLocaleTimeString())
    const ema = new EMA([this.emaPeriod])

    // Use all candles to calc EMA, to eliminate no data prior to period
    // fulfillment (initial snapshot is 240 anyway, not much data)
    allCandles.map(candle => { ema.add(candle.close) })

    const priceSeries = {
      title: 'Price',
      y: candles.map(c => c.close),
      x
    }

    const emaSeries = {
      title: `EMA(${this.emaPeriod})`,
      style: { line: 'blue' },
      y: ema._values.slice(-this.window),
      x
    }

    this.getElement().options.minY = _min(priceSeries.y)
    this.getElement().setData([priceSeries, emaSeries])
    this.render()
  }
}

module.exports = ChartWidget
