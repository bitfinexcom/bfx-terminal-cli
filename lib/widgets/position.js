'use strict'

const blessed = require('blessed')
const Widget = require('./widget')
const formatPosition = require('../format/position')

class PositionWidget extends Widget {
  constructor (terminal, { geo }) {
    super('position', {
      geo,
      terminal,
      element: blessed.element,
      elementOptions: {
        style: { border: { fg: 'gray' } },
        label: 'Position',
        valign: 'middle',
        align: 'center',
        tags: true
      },

      requiredModules: [
        'plugin:data:positions'
      ],

      hooks: {
        dataPositionSnapshot: 'onPositionSnapshot',
        dataPositionCreated: 'onPositionCreated',
        dataPositionUpdated: 'onPositionUpdated',
        dataPositionClosed: 'onPositionClosed'
      }
    })

    this.setContent('-')
  }

  updateNoPosition () {
    this.setContent('No Position Open')
  }

  updatePosition (position) {
    this.setContent(formatPosition(position))
  }

  onPositionSnapshot ({ snapshot }) {
    const symbol = this.getTerminal().getSymbol()
    const position = snapshot.find(p => p.symbol === symbol)

    if (position) {
      this.updatePosition(position)
    } else {
      this.updateNoPosition()
    }
  }

  onPositionCreated ({ position }) {
    const symbol = this.getTerminal().getSymbol()

    if (symbol === position.symbol) {
      this.updatePosition(position)
    }
  }

  onPositionUpdated ({ position }) {
    const symbol = this.getTerminal().getSymbol()

    if (symbol === position.symbol) {
      this.updatePosition(position)
    }
  }

  onPositionClosed ({ position }) {
    const symbol = this.getTerminal().getSymbol()

    if (symbol === position.symbol) {
      this.updateNoPosition()
    }
  }
}

module.exports = PositionWidget
