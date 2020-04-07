'use strict'

const colors = require('colors')
const _isFinite = require('lodash/isFinite')
const _debounce = require('lodash/debounce')
const moment = require('moment')
const blessed = require('blessed')
const columnify = require('columnify')
const blessedContrib = require('blessed-contrib')
const { RESTv2 } = require('bfx-api-node-rest')
const { Order } = require('bfx-api-node-models')
const { prepareAmount, preparePrice } = require('bfx-api-node-util')
const yArgs = require('yargs/yargs')

const genClientID = require('../util/gen_client_id')
// const { TYPES } = require('./commands/prime')
const commands = require('./commands')

const StatusWidget = require('../widgets/status')
const PositionWidget = require('../widgets/position')
const OrderBookWidget = require('../widgets/order_book')
const InternalLogWidget = require('../widgets/internal_log')
const PublicTradeLogWidget = require('../widgets/public_trade_log')
const LastTradeGroupWidget = require('../widgets/last_trade_group')
const TerminalOutputWidget = require('../widgets/terminal_output')
const ChartWidget = require('../widgets/chart')

const CoreLoggerPlugin = require('../plugins/core/logger')
const CoreUtilitiesPlugin = require('../plugins/core/utilities')
const CoreSettingsPlugin = require('../plugins/core/settings')
const CoreNotificationsPlugin = require('../plugins/core/notifications')
const WSConnectionPlugin = require('../plugins/ws/connection')
const MetaTradeGroupsPlugin = require('../plugins/meta/trade_groups')
const DataMarketInfoPlugin = require('../plugins/data/market_info')
const DataMarginInfoPlugin = require('../plugins/data/margin_info')
const DataTradesPlugin = require('../plugins/data/trades')
const DataPositionsPlugin = require('../plugins/data/positions')
const DataOrderBooksPlugin = require('../plugins/data/order_books')
const DataOrdersPlugin = require('../plugins/data/orders')
const DataCandlesPlugin = require('../plugins/data/candles')
const TradeSizeAlertsPlugin = require('../plugins/alerts/trade_size')
const TradeGroupSizeAlertsPlugin = require('../plugins/alerts/trade_group_size')

const ModuleHost = require('../module_host')

const DEFAULT_LEFT_CHART_WINDOW = 180
const DEFAULT_RIGHT_CHART_WINDOW = 30
const DEFUALT_EMA_PERIOD = 30

const AUTO_STATUS_BLINK_INTERVAL_MS = 0.5 * 1000
const NEW_ORDER_HIGHLIGHT_PERIOD_MS = 1 * 1000
const REFRESH_WAIT_MS = 2 * 1000

const SCROLLABLE_ELM_OPTIONS = (styleOpts = {}) => ({
  mouse: true,
  scrollable: true,
  scrollbar: {
    ch: '|',
    track: { bg: 'black' }
  },
  style: {
    scrollbar: { fg: 'green' },
    ...styleOpts
  }
})

/**
 * Core Terminal class hosting a set of plugin and widget modules which
 * together make up the interactive UI. For now limited to a single symbol,
 * but the utilized data plugins are multi-symbol.
 */
class Terminal extends ModuleHost {
  constructor ({ symbol, apiKey, apiSecret }) {
    super()

    const self = this

    this.symbol = symbol
    this.candles = {} // mts: candle
    this.startMTS = Date.now()
    this.lastTradeAmount = 0
    this.lastTradePrice = null
    this.emaPeriod = DEFUALT_EMA_PERIOD
    this.leftChartWindow = DEFAULT_LEFT_CHART_WINDOW
    this.rightChartWindow = DEFAULT_RIGHT_CHART_WINDOW
    this.notificationsEnabled = true
    this.autoStatusBlinkInterval = null
    this.skipNextOrderLogAutoUpdate = false
    this.balancesVisible = true
    this.quickOrderSize = 0
    this.primes = []
    this.smartBookOrder = null
    this.smartAsk = null
    this.smartBookOrderLocked = false // serves as mutex due to async order calls for
    this.smartAskLocked = false // smart bid/ask in sync onRecvOrderBook
    this.orderHistory = []
    this.orderBook = null
    this.verboseErrors = 0
    this.credentials = { apiKey, apiSecret }
    this.gid = genClientID() // shared between all orders
    this.rest = new RESTv2({
      transform: true,
      apiKey: apiKey,
      apiSecret: apiSecret
    })

    this.onRecvTrade = this.onRecvTrade.bind(this)
    this.onRecvOrderBook = this.onRecvOrderBook.bind(this)
    this.render = _debounce(this.render.bind(this), REFRESH_WAIT_MS)

    this.screen = blessed.screen({
      autoPadding: true,
      dockBorders: true,
      fullUnicode: true,
      smartCSR: true
    })

    this.screen.enableInput()
    this.screen.title = 'Bitfinex CLI Trading Terminal'
    this.screen.key(['escape', 'q', 'C-c'], () => {
      this.screen.destroy()
      process.exit(0) // eslint-disable-line
    })

    this.screenGrid = new blessedContrib.grid({ // eslint-disable-line
      rows: 20,
      cols: 8,
      screen: this.screen
    })

    this.host = new ModuleHost(this)
    this.host.addModule(CoreLoggerPlugin)
    this.host.addModule(CoreUtilitiesPlugin)
    this.host.addModule(CoreSettingsPlugin)
    this.host.addModule(CoreNotificationsPlugin)
    this.host.addModule(WSConnectionPlugin)
    this.host.addModule(DataMarginInfoPlugin)
    this.host.addModule(DataMarketInfoPlugin)
    this.host.addModule(DataTradesPlugin)
    this.host.addModule(DataPositionsPlugin)
    this.host.addModule(DataOrderBooksPlugin)
    this.host.addModule(DataOrdersPlugin)
    this.host.addModule(DataCandlesPlugin)
    this.host.addModule(MetaTradeGroupsPlugin)
    this.host.addModule(TradeSizeAlertsPlugin)
    this.host.addModule(TradeGroupSizeAlertsPlugin)

    this.host.addModule(PositionWidget, {
      geo: { x: 4, y: 0, w: 4, h: 2 }
    })

    this.host.addModule(InternalLogWidget, {
      geo: { x: 0, y: 0, w: 4, h: 2 }
    })

    this.host.addModule(PublicTradeLogWidget, {
      geo: { x: 2, y: 2, w: 1, h: 9 }
    })

    this.host.addModule(OrderBookWidget, {
      geo: { x: 3, y: 2, w: 2, h: 9 }
    })

    this.host.addModule(LastTradeGroupWidget, {
      geo: { x: 0, y: 2, w: 2, h: 1 },
      direction: 1
    })

    this.host.addModule(LastTradeGroupWidget, {
      geo: { x: 0, y: 3, w: 2, h: 1 },
      direction: -1
    })

    this.host.addModule(TerminalOutputWidget, {
      geo: { x: 5, y: 2, w: 3, h: 10 }
    })

    this.host.addModule(StatusWidget, {
      geo: { x: 0, y: 5, w: 1, h: 6 }
    })

    this.host.addModule(ChartWidget, {
      tf: '1m',
      window: 180,
      emaPeriod: 50,
      geo: { x: 0, y: 14, w: 5, h: 6 }
    })

    this.host.addModule(ChartWidget, {
      tf: '1m',
      window: 30,
      emaPeriod: 20,
      geo: { x: 5, y: 14, w: 3, h: 6 }
    })

    this.screenAutoStatus = this.screenGrid.set(4, 0, 1, 2, blessed.element, {
      style: { border: { fg: 'gray' } },
      label: 'Auto Status',
      align: 'center',
      valign: 'middle'
    })

    this.screenPrimeRulesBox = this.screenGrid.set(5, 1, 6, 1, blessed.box, {
      label: 'Prime Rules',
      style: { border: { fg: 'gray' } }
    })

    this.screenOrderLogBox = this.screenGrid.set(11, 0, 3, 5, blessed.element, {
      label: 'Order Log',
      ...SCROLLABLE_ELM_OPTIONS({ border: { fg: 'gray' } })
    })

    this.screenConsoleInputBox = this.screenGrid.set(12, 5, 2, 3, blessed.textarea, {
      label: 'Console Input',
      inputOnFocus: true,
      mouse: true,
      style: {
        border: { fg: 'white' },
        focus: {
          border: { fg: 'green' }
        }
      }
    })

    this.screenConsoleInputBox.focus()

    this.screenConsoleInputBox.key('enter', function () {
      self.onSubmitConsoleInput(this.getValue())
      this.clearValue()
      self.screen.render()
    })

    // TODO: Refactor into modules
    this.commands = commands.map(cmd => cmd(this, (...data) => {
      this.emit('terminalOutputLog', { data })
    }))

    this.clearAutoStatus()

    // Order log has relative timestamps that need to be updated
    setInterval(() => {
      if (this.skipNextOrderLogAutoUpdate) {
        this.skipNextOrderLogAutoUpdate = false
      } else {
        this.updateOrderLog()
      }
    }, 1000)

    // Prime rule list has expiry timestamps that need to be updated
    setInterval(() => {
      this.updatePrimeRuleDisplay()
    }, 1000)

    this.onBoot()
  }

  /**
   * Calls host {@link ModuleHost#boot} method, and destroys the `blessed`
   * screen followed by an error message on failure, due to `blessed` clearing
   * the screen on unhandled errors.
   */
  onBoot () {
    this.host.boot().catch((error) => {
      this.screen.destroy()
      console.error(error.stack)
    })
  }

  getCredentials () {
    return this.credentials
  }

  getWS () {
    return this.ws
  }

  getREST () {
    return this.rest
  }

  getScreen () {
    return this.screen
  }

  getScreenGrid () {
    return this.screenGrid
  }

  getConfigurableOptions () {
    return {
      'verbose-errors': {
        description: 'If 1, stack traces are shown for errors',
        get: () => this.verboseErrors ? 1 : 0,
        set: v => { this.verboseErrors = !!v },
        validate: v => v === 0 || v === 1,
        transform: v => !!(+v),
        choices: [0, 1],
        type: 'number'
      },

      notify: {
        description: 'If 1, desktop notifications are enabled',
        get: () => this.notificationsEnabled ? 1 : 0,
        set: this.setNotificationsEnabled.bind(this),
        validate: v => v === 0 || v === 1,
        transform: v => !!(+v),
        choices: [0, 1],
        type: 'number'
      },

      'quick-size': {
        description: 'Quick order size, used as default in order commands',
        get: () => this.quickOrderSize,
        set: this.setQuickOrderSize.bind(this),
        validate: v => _isFinite(+v),
        transform: v => +v,
        type: 'string'
      }
    }
  }

  /**
   * Renders the `blessed` screen; debounced in constructor
   */
  render () {
    this.screen.render()
  }

  setupPrime ({ type, threshold, amount, tif }) {
    if (this.primes.find(p => p.type === type && p.threshold === threshold)) {
      throw new Error(
        `Prime rule already exists for type ${type} with threshold ${threshold}`
      )
    }

    this.primes.push({ type, threshold, amount, tif })
    this.updatePrimeRuleDisplay()

    if (this.primes.length === 1) {
      this.setPrimedAutoStatus()
    }
  }

  deletePrime (index) {
    const rule = this.primes[index]

    if (rule) {
      const { type, threshold } = rule
      this.primes.splice(index, 1)
      this.logStar('Removed prime rule %d of type %s, %s', index, type, threshold)
      this.updatePrimeRuleDisplay()

      if (this.primes.length === 0) {
        this.clearAutoStatus()
      }
      return true
    } else {
      this.l.error('No such prime rule, cannot remove: %d', index)
      return false
    }
  }

  getPrimeIDs () {
    return Object.keys(this.primes).map(id => +id)
  }

  async setupSmartBookOrder (amount) {
    if (this.smartBookOrder) {
      throw new Error('A smart book order already exists')
    } else {
      this.smartBookOrder = {
        order: null, // will be created on next book update
        amount
      }
    }
  }

  getActiveOrderIDs () {
    return this.orderHistory
      .map((_, id) => id)
      .filter(id => {
        const o = this.orderHistory[id]
        const { amount, status } = o

        return (
          (amount !== 0) &&
          !/(canceled|executed)/.test((status || '').toLowerCase())
        )
      })
  }

  async cancelOrdersByID (ids) {
    for (let i = 0; i < ids.length; i += 1) {
      if (!this.orderHistory[ids[i]]) {
        throw new Error(`Unknown order, cannot cancel: ${ids[i]}`)
      }
    }

    const orders = ids.map(id => this.orderHistory[id])

    for (let i = 0; i < orders.length; i += 1) {
      const { id, amount, status } = orders[i]

      if (amount === 0 || /(canceled|executed)/.test((status || ''))) {
        throw new Error(`Order inactive, cannot cancel: ${id}`)
      } else if (this.smartBookOrder && this.smartBookOrder.order && this.smartBookOrder.order.id === id) {
        this.smartBookOrder = null // clear bid
      }
    }

    return this.cancelOrders(orders)
  }

  getSymbol () {
    return this.symbol
  }

  getCommands () {
    return this.commands
  }

  async onSubmitConsoleInput (value) {
    const input = value.trim()
    this.logOutput(`> ${input.gray}`)

    let y = yArgs(input)
      .scriptName('')
      .exitProcess(false)
      .showHelpOnFail(false)
      .help(false)
      .version(false)
      .fail((output, err) => {
        throw (err || new Error(output))
      })

    this.commands.forEach(cmd => { y = cmd(y) })

    // This is convoluted as yargs has no elegant mechanism for dynamic args
    // parsing at runtime. By default help/output is logged to the console,
    // which cannot be done here as we use blessed for UI.
    //
    // As such, auto-help (--help) support is disabled above, and the flag
    // detected + converted to an error below, alongside generic failure
    // messages handled by the .fail() block above.
    //
    // The help test must be in the catch block since yargs will fail parsing
    // 'prime --help' for example (missing required args)
    try {
      const { argv } = y
      const { _, help } = argv
      const [parsedCommand] = _

      if (help || parsedCommand === 'help') {
        throw new Error() // help output shown in catch block if help flag
      }
    } catch (e) {
      if (/help/.test(input)) {
        y.showHelp((output) => {
          output.split('\n').forEach(l => {
            this.logOutput('%s', l)
          })
        })
      } else {
        (this.verboseErrors ? e.stack : e.message).split('\n').forEach(l => {
          this.logOutput('%s'.red, l)
        })
      }
    }
  }

  setQuickOrderSize (size) {
    this.quickOrderSize = size
  }

  getQuickOrderSize () {
    return this.quickOrderSize
  }

  setNotificationsEnabled (notify) {
    if (notify === this.notificationsEnabled) {
      return
    }

    this.notificationsEnabled = notify

    if (notify) {
      this.notifySuccess({
        title: 'Notifications Enabled',
        message: 'You will receive desktop notifications from now on'
      })
    }
  }

  async cancelOrders (orders) {
    for (let i = 0; i < orders.length; i += 1) { // verify payload is OK
      if (!orders[i].id) {
        throw new Error('Order lacking ID and CID, cannot cancel')
      }
    }

    for (let i = 0; i < orders.length; i += 1) {
      orders[i].on('close', () => {
        this.notifyImportant({
          title: 'Canceled Order',
          message: `Order ID ${orders[i].id}`
        })
      })
    }

    try {
      this.ws.send([0, 'oc_multi', null, { id: orders.map(o => o.id) }])
    } catch (e) { // socket may have closed
      this.notifyError({
        title: 'Failed to Cancel Orders',
        message: e.message
      })
    }
  }

  async submitOrder (o) {
    o.cid = genClientID()
    o.gid = this.gid

    // Listeners are registered here, and removed in the 'close' method
    o.on('new', () => { this.updateOrderLog() })
    o.on('update', () => { this.updateOrderLog() })
    o.on('close', (order) => {
      order.removeListeners()
      this.updateOrderLog()
    })

    o.registerListeners(this.ws)
    this.orderHistory.push(o)
    this.updateOrderLog(this.orderHistory.length - 1)

    this.logStar('Submitting order: %s', o.toString())
    await o.submit()

    this.notifySuccess({
      title: 'Order Submitted',
      message: o.toString()
    })
  }

  updateOrderLog (newOrderIndex) {
    this.screenOrderLogBox.setContent(this.orderHistory.map((o, i) => {
      const active = o.amount !== 0 && !/(canceled|executed)/.test((o.status || '').toLowerCase())
      const aCL = o.amount < 0 ? colors.red : colors.green
      const inv = i === newOrderIndex || active ? colors.inverse : l => l
      const {
        type, amount, amountOrig, price, priceAvg, status, mtsCreate
      } = o

      return inv(aCL([
        `ID: ${i}`,
        (status || '').trim(),
        type,
        +prepareAmount(amount),
        '@',
        +preparePrice(priceAvg === 0 ? price : priceAvg),
        `(${+prepareAmount(amountOrig)})`,
        `[NV ${+prepareAmount(amountOrig * (priceAvg === 0 ? price : priceAvg))}]`,
        colors.gray(moment(mtsCreate).fromNow())
      ].join(' ')))
    }).join('\n'))

    if (_isFinite(newOrderIndex)) {
      setTimeout(() => {
        this.screenOrderLogBox.setLine(
          newOrderIndex,
          colors.inverse(this.screenOrderLogBox.getLine(newOrderIndex))
        )
        this.render()
      }, NEW_ORDER_HIGHLIGHT_PERIOD_MS)

      this.skipNextOrderLogAutoUpdate = true
    }

    this.screenOrderLogBox.scrollTo(this.screenOrderLogBox.getLines().length)
    this.render()
  }

  updatePrimeRuleDisplay () {
    const columns = columnify(this.primes.map(({ type, threshold, tif }, i) => {
      const tCL = _isFinite(threshold)
        ? (threshold < 0 ? colors.red : colors.green)
        : colors.blue

      return {
        id: i,
        type: type.blue,
        threshold: tCL(threshold),
        expiry: colors.blue(_isFinite(tif) ? moment(+tif).fromNow() : '∞')
      }
    }), {
      config: {
        type: { align: 'right' },
        threshold: { align: 'center' }
      }
    })

    this.screenPrimeRulesBox.setContent(columns)
  }

  clearAutoStatus () {
    this.screenAutoStatus.setContent('Idle')
    this.screenAutoStatus.style.bg = 'transparent'
    this.screenAutoStatus.style.fg = 'white'

    if (this.autoStatusBlinkInterval) {
      clearInterval(this.autoStatusBlinkInterval)
      this.autoStatusBlinkInterval = null
    }

    this.render()
  }

  setPrimedAutoStatus () {
    this.screenAutoStatus.setContent('PRIMED')
    this.screenAutoStatus.style.bg = 'transparent'
    this.screenAutoStatus.style.fg = 'white'

    if (this.autoStatusBlinkInterval) {
      clearInterval(this.autoStatusBlinkInterval)
    }

    this.autoStatusBlinkInterval = setInterval(() => {
      if (this.screenAutoStatus.style.bg === 'transparent') {
        this.screenAutoStatus.style.bg = 'yellow'
        this.screenAutoStatus.style.fg = 'black'
      } else {
        this.screenAutoStatus.style.bg = 'transparent'
        this.screenAutoStatus.style.fg = 'white'
      }

      this.render()
    }, AUTO_STATUS_BLINK_INTERVAL_MS)
  }

  // TODO: Refactor out
  async connect () {
    // TODO: Move/extract/refactor
    /*
    this.ws.onOrderSnapshot({}, (snapshot) => {
      this.orderHistory.push(...snapshot)
      this.updateOrderLog()
    })
    */

    // TODO: Refactor out
    this.on('dataTradeEntry', ({ symbol, trade }) => {
      if (symbol === this.symbol) {
        this.onRecvTrade(trade)
      }
    })

    // TODO: Refactor out
    this.on('dataOrderBook', ({ orderBook }) => {
      this.onRecvOrderBook(orderBook)
    })
  }

  async evaluatePrimes (trade) {
    /*
    const { amount } = trade
    let primeExecuted = false

    for (let i = this.primes.length - 1; i >= 0; i -= 1) {
      const prime = this.primes[i]
      const { type, threshold, amount: primeAmount, tif } = prime

      if (_isFinite(tif) && tif < Date.now()) {
        this.logInfo('prime rule expired (%s threshold %s)', type, threshold)
        this.primes.splice(i, 1)
        this.updatePrimeRuleDisplay()
        continue
      }

      if (
        (type === TYPES.size && (
          (threshold > 0 && amount >= threshold) ||
          (threshold < 0 && amount <= threshold)
        )) ||
        (type === TYPES['group-size'] && (
          (threshold > 0 && this.buyGroupSize >= threshold) ||
          (threshold < 0 && this.sellGroupSize <= threshold)
        ))
      ) {
        this.notifyImportant({
          title: 'Prime Trigger',
          message: [
            'Rule (%s) triggered\n%f %s %f',
            type,
            amount,
            threshold < 0 ? '<=' : '>=',
            threshold
          ]
        })

        await this.submitOrder(new Order({
          symbol: this.symbol,
          type: Order.type.MARKET,
          amount: _isFinite(primeAmount)
            ? primeAmount
            : threshold < 0
              ? -1 * this.quickOrderSize
              : this.quickOrderSize
        }))

        primeExecuted = true
        break
      }
    }

    // Clear primes if one is triggered; maybe refactor, but if a prime executes
    // the reasoning behind the other primes is likely no longer valid. Very
    // opinionated, maybe make optional.
    if (primeExecuted) {
      this.primes = []
      this.updatePrimeRuleDisplay()
      this.clearAutoStatus()
    }
    */
  }

  async onRecvOrderBook (book) {
    this.orderBook = book

    if (this.smartBookOrder && !this.smartBookOrderLocked) {
      const { amount } = this.smartBookOrder
      const topBid = book.topBid()
      const topAsk = book.topAsk()
      const top = amount < 0 ? topAsk : topBid
      const desiredPrice = +preparePrice(
        top + ((amount < 0 ? -1 : 1) * (1 / (Math.pow(10, this.pricePrecision))))
      )

      if (!this.smartBookOrder.order) {
        this.smartBookOrderLocked = true
        const start = Date.now()
        const order = new Order({
          type: Order.type.LIMIT,
          symbol: this.symbol,
          price: desiredPrice,
          postonly: true,
          amount
        })

        order.on('close', (o) => {
          const { amountOrig, priceAvg } = o

          this.smartBookOrder = null
          this.notifyImportant({
            title: /canceled/.test((o.status || '').toLowerCase())
              ? 'Smart Book Order Canceled'
              : 'Smart Book Order Executed',

            message: [
              '%f @ %f', prepareAmount(amountOrig), preparePrice(priceAvg)
            ]
          })
        })

        this.smartBookOrder.order = order

        try {
          await this.submitOrder(order)
          this.logStar('Submitted smart book order (in %dms)', Date.now() - start)
        } catch (e) {
          this.notifyError({
            title: 'Error',
            message: ['Failed to submit order: %s', e.message]
          })
        }

        this.smartBookOrderLocked = false
      } else {
        const { order } = this.smartBookOrder
        const { id, price } = order

        // Note ID is required; received on confirmation notification
        if (
          id && (
            (amount > 0 && price < desiredPrice) ||
            (amount < 0 && price > desiredPrice)
          )
        ) {
          this.smartBookOrderLocked = true

          try {
            await order.update({ price: desiredPrice })
          } catch (e) {
            this.smartBookOrder = null // clear smart order
            this.notifyError({
              title: 'Error',
              message: ['Failed to update order: %s', e.message]
            })
          }

          this.smartBookOrderLocked = false
          this.logInfo('Moved smart book order to %f', desiredPrice)
        }
      }
    }
  }

  async onRecvTrade (trade) {
    this.lastTradeAmount = trade.amount
    this.lastTradePrice = trade.price

    return this.evaluatePrimes(trade)
  }
}

module.exports = Terminal
