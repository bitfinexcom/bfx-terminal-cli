'use strict'

const blessed = require('blessed')
const Widget = require('./widget')

class StatusWidget extends Widget {
  constructor (terminal, { geo }) {
    super('status', {
      geo,
      terminal,
      element: blessed.box,
      elementOptions: {
        label: 'Status',
        style: { border: { fg: 'gray' } }
      }
    })
  }
}

module.exports = StatusWidget
