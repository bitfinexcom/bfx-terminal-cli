'use strict'

const colors = require('colors')
const _min = require('lodash/min')
const _uniq = require('lodash/uniq')
const _flatten = require('lodash/flatten')
const _isFinite = require('lodash/isFinite')
const _debounce = require('lodash/debounce')
const _includes = require('lodash/includes')
const moment = require('moment')
const blessed = require('blessed')
const columnify = require('columnify')
const blessedContrib = require('blessed-contrib')
const { WSv2 } = require('bitfinex-api-node')
const { EMA } = require('bfx-hf-indicators')
const { RESTv2 } = require('bfx-api-node-rest')
const { Order } = require('bfx-api-node-models')
const { prepareAmount, preparePrice } = require('bfx-api-node-util')
const yArgs = require('yargs/yargs')
const { EventEmitter } = require('events')

const genClientID = require('../util/gen_client_id')
// const { TYPES } = require('./commands/prime')
const commands = require('./commands')
const ModuleAddError = require('../errors/module_add_error')

const PositionWidget = require('../widgets/position')
const OrderBookWidget = require('../widgets/order_book')
const InternalLogWidget = require('../widgets/internal_log')
const PublicTradeLogWidget = require('../widgets/public_trade_log')
const LastTradeGroupWidget = require('../widgets/last_trade_group')
const TerminalOutputWidget = require('../widgets/terminal_output')

const LoggerPlugin = require('../plugins/logger')
const WSHooksPlugin = require('../plugins/ws_hooks')
const TradeGroupsPlugin = require('../plugins/trade_groups')
const NotificationsPlugin = require('../plugins/notifications')
const TradeSizeAlertsPlugin = require('../plugins/trade_size_alerts')
const TradeGroupSizeAlertsPlugin = require('../plugins/trade_group_size_alerts')

// TODO: Default to unset alert thresholds, need to handle 'null' in relevant
// logic
const DEFAULT_TRADE_SIZE_ALERT_THRESHOLD = 3
const DEFAULT_GROUP_SIZE_ALERT_THRESHOLD = 20
const DEFAULT_LEFT_CHART_WINDOW = 180
const DEFAULT_RIGHT_CHART_WINDOW = 30
const DEFUALT_EMA_PERIOD = 30

const CENSOR_STR = 'HIDDEN'
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

class Terminal extends EventEmitter {
  constructor ({ symbol, apiKey, apiSecret }) {
    super()

    const self = this

    this.symbol = symbol
    this.candles = {} // mts: candle
    this.startMTS = Date.now()
    this.lastTradeAmount = 0
    this.lastTradePrice = null
    this.tradeSizeAlertThreshold = DEFAULT_TRADE_SIZE_ALERT_THRESHOLD
    this.groupSizeAlertThreshold = DEFAULT_GROUP_SIZE_ALERT_THRESHOLD
    this.emaPeriod = DEFUALT_EMA_PERIOD
    this.leftChartWindow = DEFAULT_LEFT_CHART_WINDOW
    this.rightChartWindow = DEFAULT_RIGHT_CHART_WINDOW
    this.notificationsEnabled = true
    this.autoStatusBlinkInterval = null
    this.skipNextOrderLogAutoUpdate = false
    this.balancesVisible = true
    this.quickOrderSize = 0
    this.marginInfo = {}
    this.primes = []
    this.smartBookOrder = null
    this.smartAsk = null
    this.smartBookOrderLocked = false // serves as mutex due to async order calls for
    this.smartAskLocked = false // smart bid/ask in sync onRecvOrderBook
    this.orderHistory = []
    this.orderBook = null
    this.pricePrecision = 0
    this.minTradeSize = 0
    this.maxLeverage = 0
    this.verboseErrors = 0
    this.gid = genClientID() // shared between all orders
    this.rest = new RESTv2({
      transform: true,
      apiKey: apiKey,
      apiSecret: apiSecret
    })

    this.ws = new WSv2({
      transform: true,
      apiKey,
      apiSecret,
      autoReconnect: true,
      reconnectDelay: 5 * 1000,
      manageOrderBooks: true
    })

    this.terminalProvidedHooks = ['terminalBooted']
    this.modules = []

    this.addModule(new LoggerPlugin(this))
    this.addModule(new WSHooksPlugin(this))
    this.addModule(new TradeGroupsPlugin(this))
    this.addModule(new NotificationsPlugin(this))
    this.addModule(new TradeSizeAlertsPlugin(this, {
      threshold: DEFAULT_TRADE_SIZE_ALERT_THRESHOLD
    }))

    this.addModule(new TradeGroupSizeAlertsPlugin(this, {
      threshold: DEFAULT_GROUP_SIZE_ALERT_THRESHOLD
    }))

    this.onRecvTrade = this.onRecvTrade.bind(this)
    this.onRecvCandles = this.onRecvCandles.bind(this)
    this.onRecvOrderBook = this.onRecvOrderBook.bind(this)
    this.render = _debounce(this.render.bind(this), REFRESH_WAIT_MS)

    this.screen = blessed.screen({
      smartCSR: true,
      autoPadding: true,
      dockBorders: true,
      fullUnicode: true
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

    this.addModule(new PositionWidget(this, {
      geo: { x: 4, y: 0, w: 4, h: 2 }
    }))

    this.addModule(new InternalLogWidget(this, {
      geo: { x: 0, y: 0, w: 4, h: 2 }
    }))

    this.addModule(new PublicTradeLogWidget(this, {
      geo: { x: 2, y: 2, w: 1, h: 9 }
    }))

    this.addModule(new OrderBookWidget(this, {
      geo: { x: 3, y: 2, w: 2, h: 9 }
    }))

    this.addModule(new LastTradeGroupWidget(this, {
      geo: { x: 0, y: 2, w: 2, h: 1 },
      direction: 1
    }))

    this.addModule(new LastTradeGroupWidget(this, {
      geo: { x: 0, y: 3, w: 2, h: 1 },
      direction: -1
    }))

    this.addModule(new TerminalOutputWidget(this, {
      geo: { x: 5, y: 2, w: 3, h: 10 }
    }))

    this.screenAutoStatus = this.screenGrid.set(4, 0, 1, 2, blessed.element, {
      style: { border: { fg: 'gray' } },
      label: 'Auto Status',
      align: 'center',
      valign: 'middle'
    })

    this.screenStatusBox = this.screenGrid.set(5, 0, 6, 1, blessed.box, {
      label: 'Status',
      style: { border: { fg: 'gray' } }
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

    this.screenGraphLeft = this.screenGrid.set(14, 0, 6, 5, blessedContrib.line, {
      label: `${this.leftChartWindow}min Price & EMA(${this.emaPeriod})`,
      wholeNumbersOnly: false,
      xPadding: 3,
      xLabelPadding: 3,
      style: {
        line: 'white',
        text: 'green',
        baseline: 'green',
        border: { fg: 'gray' }
      }
    })

    this.screenGraphRight = this.screenGrid.set(14, 5, 6, 3, blessedContrib.line, {
      label: `${this.rightChartWindow}min Price & EMA(${this.emaPeriod})`,
      wholeNumbersOnly: false,
      xPadding: 3,
      xLabelPadding: 3,
      style: {
        line: 'white',
        text: 'green',
        baseline: 'green',
        border: { fg: 'gray' }
      }
    })

    this.commands = commands.map(cmd => cmd(this, (...data) => {
      this.emit('terminalOutputLog', { data })
    }))

    this.updateStatus()
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

    setTimeout(() => {
      this.emit('terminalBooted')
    })
  }

  getWS () {
    return this.ws
  }

  getModules () {
    return this.modules
  }

  getScreen () {
    return this.screen
  }

  getScreenGrid () {
    return this.screenGrid
  }

  getNotificationsEnabled () {
    return this.notificationsEnabled
  }

  addModule (module) {
    const providedHooks = module.getProvidedHooks()
    const requiredHooks = module.getRequiredHooks()
    const unique = module.isUnique()
    const id = module.getID()

    if (unique && this.modules.find(m => m.getID() === id)) {
      throw new ModuleAddError(`Module unique but already present: ${id}`)
    }

    const allHooks = _uniq(_flatten([
      this.terminalProvidedHooks, providedHooks,
      _flatten(this.modules.map(m => m.getProvidedHooks()))
    ]))

    requiredHooks.forEach((name) => {
      if (!_includes(allHooks, name)) {
        throw new Error(
          `Module ${id} requires hook ${name} but not provided by any module`
        )
      }
    })

    this.modules.push(module)
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

      'balance-visibility': {
        description: 'Whether balances are rendered; disable for screenshots',
        get: () => this.balancesVisible ? 1 : 0,
        set: this.setBalancesVisible.bind(this),
        validate: v => v === 0 || v === 1,
        transform: v => !!(+v),
        choices: [0, 1],
        type: 'number'
      },

      'size-alert': {
        description: 'Trade size alerting threshold, absolute value',
        get: () => this.tradeSizeAlertThreshold,
        set: this.setTradeSizeAlertThreshold.bind(this),
        validate: v => _isFinite(+v),
        transform: v => +v,
        type: 'string'
      },

      'group-size-alert': {
        description: 'Trade group size alerting threshold; absolute value',
        get: () => this.groupSizeAlertThreshold,
        set: this.setTradeGroupSizeAlertThreshold.bind(this),
        validate: v => _isFinite(+v),
        transform: v => +v,
        type: 'string'
      },

      'ema-period': {
        description: 'Chart EMA indicator period',
        get: () => this.emaPeriod,
        set: this.setEMAPeriod.bind(this),
        validate: _isFinite,
        transform: v => +v,
        type: 'number'
      },

      'left-chart-window': {
        description: 'Number of candles visible in left chart',
        get: () => this.leftChartWindow,
        set: this.setLeftChartWindow.bind(this),
        validate: _isFinite,
        transform: v => +v,
        type: 'number'
      },

      'right-chart-window': {
        description: 'Number of candles visible in right chart',
        get: () => this.rightChartWindow,
        set: this.setRightChartWindow.bind(this),
        validate: _isFinite,
        transform: v => +v,
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

  // Debounced in constructor
  render () {
    this.screen.render()
  }

  setBalancesVisible (visible) {
    this.balancesVisible = visible
    this.updateStatus()
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
      this.l.star('Removed prime rule %d of type %s, %s', index, type, threshold)
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

  setTradeSizeAlertThreshold (size) {
    this.tradeSizeAlertThreshold = size
    this.updateStatus()
  }

  setTradeGroupSizeAlertThreshold (size) {
    this.groupSizeAlertThreshold = size
    this.updateStatus()
  }

  setLeftChartWindow (window) {
    this.leftChartWindow = window
    this.screenGraphLeft.setLabel({
      text: `${this.leftChartWindow}min Price & EMA(${this.emaPeriod})`
    })

    this.updatePriceCharts()
  }

  setRightChartWindow (window) {
    this.rightChartWindow = window
    this.screenGraphRight.setLabel({
      text: `${this.rightChartWindow}min Price & EMA(${this.emaPeriod})`
    })

    this.updatePriceCharts()
  }

  setEMAPeriod (period) {
    this.emaPeriod = period
    this.updatePriceCharts()
  }

  setQuickOrderSize (size) {
    this.quickOrderSize = size
    this.updateStatus()
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

    this.l.star('Submitting order: %s', o.toString())
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

  updateStatus () {
    const lastPrice = _isFinite(this.lastTradePrice)
      ? preparePrice(this.lastTradePrice)
      : '-'

    const pl = _isFinite(this.marginInfo.userPL)
      ? prepareAmount(this.marginInfo.userPL)
      : '-'

    const plCL = !_isFinite(+pl)
      ? colors.cyan
      : +pl === 0
        ? colors.cyan
        : +pl > 0
          ? colors.bgGreen.black
          : colors.bgRed.black

    const marginBalance = _isFinite(this.marginInfo.marginBalance)
      ? this.marginInfo.marginBalance.toFixed(2)
      : '-'

    const marginNet = _isFinite(this.marginInfo.marginNet)
      ? this.marginInfo.marginNet.toFixed(2)
      : '-'

    const tradableBalance = _isFinite(+marginNet)
      ? colors.bgMagenta.black(`${(marginNet * this.maxLeverage).toFixed(2)}`)
      : '-'

    const maxLeverage = this.maxLeverage
      ? `${this.maxLeverage.toFixed(1)}`
      : '-'

    const statusContent = [
      `Size Alert: ${`${this.tradeSizeAlertThreshold}`.yellow}`,
      `Group Size Alert: ${`${this.groupSizeAlertThreshold}`.yellow}`,
      '',
      `Quick Size: ${`${this.quickOrderSize}`.yellow}`,
      '',
      `P/L: ${this.balancesVisible ? plCL(pl) : CENSOR_STR}`,
      `Balance: ${this.balancesVisible ? marginBalance.green : CENSOR_STR}`,
      `Net: ${this.balancesVisible ? marginNet.green : CENSOR_STR}`,
      `Tradable: ${this.balancesVisible ? tradableBalance : CENSOR_STR}`,
      '',
      `Min Size: ${`${this.minTradeSize || '-'}`.yellow}`,
      `Max Leverage: ${maxLeverage.yellow}`,
      `Price Prec: ${`${this.pricePrecision}`.yellow}`,
      `Last Price: ${colors.underline(lastPrice)}`
    ]

    this.screenStatusBox.setContent(statusContent.join('\n'))
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

  getGroupSizeAlertThreshold () {
    return this.groupSizeAlertThreshold
  }

  getTradeSizeAlertThreshold () {
    return this.tradeSizeAlertThreshold
  }

  async connect () {
    const symbol = this.symbol

    if (this.ws.isOpen()) {
      throw new Error('Connection already open')
    }

    this.l.info('fetching margin info...')

    this.marginInfo = await this.rest.marginInfo()
    this.updateStatus()

    this.ws.onMarginInfoUpdate({}, (info) => {
      if (info.type !== 'base') {
        return
      }

      this.marginInfo = info
      this.updateStatus()
    })

    // TODO: Move/extract/refactor
    this.ws.onOrderSnapshot({}, (snapshot) => {
      this.orderHistory.push(...snapshot)
      this.updateOrderLog()
    })

    this.l.info('fetching leverage info...')

    const res = await this.rest.conf(['pub:info:pair'])
    const [info] = res
    const marketInfo = info.find(l => l[0] === this.symbol.substring(1))

    if (!marketInfo) {
      throw new Error(`Failed to fetch market information for symbol ${symbol}`)
    }

    this.maxLeverage = 1 / marketInfo[1][8]
    this.minTradeSize = +marketInfo[1][3]
    this.quickOrderSize = this.minTradeSize

    this.l.info(
      'got max leverage of %f and min trade size of %f for market %s',
      this.maxLeverage.toFixed(1), this.minTradeSize, symbol
    )

    this.l.info('fetching market info...')

    const allSymbols = await this.rest.symbolDetails()
    const symbolData = allSymbols.find(d => (
      d.pair === this.symbol.substring(1).toLowerCase()
    ))

    if (!symbolData) {
      throw new Error(`Failed to fetch symbol details for symbol ${symbol}`)
    }

    this.pricePrecision = symbolData.price_precision // eslint-disable-line

    this.updateStatus()

    this.l.info('connecting...')
    await this.ws.open()
    this.l.success('connected!')

    await this.ws.auth()
    this.l.success('authenticated!')

    const candleKey = `trade:1m:${symbol}`

    // TODO: Refactor out
    this.on('wsTradeEntry', ({ trade }) => {
      if (trade.symbol === this.symbol) {
        this.onRecvTrade(trade)
      }
    })

    this.ws.onCandle({ key: candleKey }, this.onRecvCandles)

    // TODO: Refactor out
    this.on('wsOrderBook', ({ orderBook }) => {
      this.onRecvOrderBook(orderBook)
    })

    this.l.info('subscribing to trades for %s...', symbol)
    await this.ws.subscribeTrades(symbol)
    this.l.success('subscribed to trades for %s', symbol)

    this.l.info('subscribing to 1min candles for %s...', symbol)
    await this.ws.subscribeCandles(candleKey)
    this.l.success('subscribed to candles for %s', symbol)

    this.l.info('subscribing to order book for %s...', symbol)
    await this.ws.subscribeOrderBook(symbol, 'P0', '25')
    this.l.success('subscribed to order book for %s', symbol)

    // TODO: Refactor
    setInterval(() => {
      this.ws.requestCalc([
        'margin_base',
        `margin_sym_${this.symbol}`,
        `position_${this.symbol}`
      ])
    }, 5 * 1000) // aggressive
  }

  async evaluatePrimes (trade) {
    /*
    const { amount } = trade
    let primeExecuted = false

    for (let i = this.primes.length - 1; i >= 0; i -= 1) {
      const prime = this.primes[i]
      const { type, threshold, amount: primeAmount, tif } = prime

      if (_isFinite(tif) && tif < Date.now()) {
        this.l.info('prime rule expired (%s threshold %s)', type, threshold)
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
          this.l.star('Submitted smart book order (in %dms)', Date.now() - start)
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
          this.l.info('Moved smart book order to %f', desiredPrice)
        }
      }
    }
  }

  onRecvCandles (candle) {
    const candles = candle.length ? candle : [candle]

    for (let i = 0; i < candles.length; i += 1) {
      this.candles[candles[i].mts] = candles[i]
    }

    this.updatePriceCharts()
  }

  async onRecvTrade (trade) {
    this.updateLastCandleClose(trade.price)
    this.updatePriceCharts()

    this.lastTradeAmount = trade.amount
    this.lastTradePrice = trade.price

    this.updateStatus()
    return this.evaluatePrimes(trade)
  }

  updateLastCandleClose (price) {
    const timestamps = Object.keys(this.candles)
    timestamps.sort((a, b) => +b - +a)
    const currMTS = timestamps[0]
    this.candles[currMTS].close = price
  }

  updatePriceCharts () {
    const timestamps = Object.keys(this.candles)
    timestamps.sort((a, b) => +a - +b)
    const timestampsLeft = timestamps.slice(-this.leftChartWindow)
    const timestampsRight = timestamps.slice(-this.rightChartWindow)

    const ema = new EMA([this.emaPeriod])

    timestamps.map((mts) => {
      ema.add(this.candles[mts].close)
    })

    const priceSeriesLeft = {
      title: 'Price',
      x: timestampsLeft.map(t => new Date(+t).toLocaleTimeString()),
      y: timestampsLeft.map(mts => this.candles[mts].close)
    }

    const emaSeriesLeft = {
      title: `EMA(${this.emaPeriod})`,
      x: timestampsLeft.map(t => new Date(+t).toLocaleTimeString()),
      y: ema._values.slice(-this.leftChartWindow),
      style: { line: 'blue' }
    }

    const priceSeriesRight = {
      title: 'Price',
      x: timestampsRight.map(t => new Date(+t).toLocaleTimeString()),
      y: timestampsRight.map(mts => this.candles[mts].close)
    }

    const emaSeriesRight = {
      title: `EMA(${this.emaPeriod})`,
      x: timestampsRight.map(t => new Date(+t).toLocaleTimeString()),
      y: ema._values.slice(-this.rightChartWindow),
      style: { line: 'blue' }
    }

    this.screenGraphLeft.options.minY = _min(priceSeriesLeft.y)
    this.screenGraphLeft.setData([
      priceSeriesLeft,
      emaSeriesLeft
    ])

    this.screenGraphRight.options.minY = _min(priceSeriesRight.y)
    this.screenGraphRight.setData([
      priceSeriesRight,
      emaSeriesRight
    ])

    this.render()
  }
}

module.exports = Terminal
