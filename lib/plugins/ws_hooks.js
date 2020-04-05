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
        'wsTradeEntry',
        'wsOrderBook',
        'wsError'
      ]
    })

    this.onPositionSnapshot = this.onPositionSnapshot.bind(this)
    this.onPositionCreated = this.onPositionCreated.bind(this)
    this.onPositionUpdated = this.onPositionUpdated.bind(this)
    this.onPositionClosed = this.onPositionClosed.bind(this)
    this.onTradeEntry = this.onTradeEntry.bind(this)
    this.onOrderBook = this.onOrderBook.bind(this)
    this.onError = this.onError.bind(this)

    const ws = this.getTerminal().getWS()

    ws.onPositionSnapshot({}, this.onPositionSnapshot)
    ws.onPositionUpdate({}, this.onPositionUpdated)
    ws.onPositionClose({}, this.onPositionClosed)
    ws.onPositionNew({}, this.onPositionCreated)
    ws.onTradeEntry({}, this.onTradeEntry)
    ws.onOrderBook({}, this.onOrderBook)
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

  onError (error) {
    this.emit('wsError', { error })
  }
}

module.exports = WSHooksPlugin
