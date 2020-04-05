'use strict'

const Plugin = require('./plugin')

class WSHooksPlugin extends Plugin {
  constructor (terminal) {
    super('ws-hooks', {
      terminal,
      providedHooks: [
        'wsPositionSnapshot',
        'wsPositionCreated',
        'wsPositionUpdated',
        'wsPositionClosed',
        'wsMarginInfo',
        'wsTradeEntry',
        'wsOrderBook',
        'wsError'
      ]
    })

    this.onMarginInfoUpdate = this.onMarginInfoUpdate.bind(this)
    this.onPositionSnapshot = this.onPositionSnapshot.bind(this)
    this.onPositionCreated = this.onPositionCreated.bind(this)
    this.onPositionUpdated = this.onPositionUpdated.bind(this)
    this.onPositionClosed = this.onPositionClosed.bind(this)
    this.onTradeEntry = this.onTradeEntry.bind(this)
    this.onOrderBook = this.onOrderBook.bind(this)
    this.onError = this.onError.bind(this)

    const ws = this.getTerminal().getWS()
    const symbol = this.getTerminal().getSymbol()

    ws.onMarginInfoUpdate({}, this.onMarginInfoUpdate)
    ws.onPositionSnapshot({}, this.onPositionSnapshot)
    ws.onPositionUpdate({ symbol }, this.onPositionUpdated)
    ws.onPositionClose({ symbol }, this.onPositionClosed)
    ws.onPositionNew({ symbol }, this.onPositionCreated)
    ws.onTradeEntry({ symbol }, this.onTradeEntry)
    ws.onOrderBook({ symbol }, this.onOrderBook)
    ws.on('error', this.onError)
  }

  onOrderBook (orderBook) {
    this.emit('wsOrderBook', { orderBook })
  }

  onTradeEntry (trade) {
    this.emit('wsTradeEntry', { trade })
  }

  onPositionSnapshot (snapshot) {
    this.emit('wsPositionSnapshot', { snapshot })
  }

  onPositionCreated (position) {
    this.emit('wsPositionCreated', { position })
  }

  onPositionUpdated (position) {
    this.emit('wsPositionUpdated', { position })
  }

  onPositionClosed (position) {
    this.emit('wsPositionClosed', { position })
  }

  onMarginInfoUpdate (info) {
    if (info.type !== 'base') {
      return
    }

    this.emit('wsMarginInfo', info)
  }

  onError (error) {
    this.emit('wsError', { error })
  }
}

module.exports = WSHooksPlugin
