'use strict'

const TerminalModule = require('../terminal_module')
const validateMultiple = require('../validate_multiple')
const validateWidgetGeometry = require('../validation/widget_geometry')

/**
 * Base class for UI terminal widgets; provides basic terminal access and
 * helper methods for blessed element function calls.
 */
class Widget extends TerminalModule {
  constructor (id, { geo, element, elementOptions = {}, ...options }) {
    validateMultiple([
      [validateWidgetGeometry, geo]
    ])

    super(`widget:${id}`, options)

    this.element = this.getTerminal().getScreenGrid().set(
      geo.y, geo.x, geo.h, geo.w, element, elementOptions
    )
  }

  getElement () {
    return this.element
  }

  setContent (content) {
    this.element.setContent(content)
  }

  pushLine (line) {
    this.element.pushLine(line)
  }

  scrollTo (index) {
    this.element.scrollTo(index)
  }

  scrollToEnd () {
    this.scrollTo(this.getLines().length)
  }

  getLines () {
    return this.element.getLines()
  }

  setLabel (label) {
    this.element.setLabel(label)
  }

  getText () {
    return this.element.getText()
  }
}

module.exports = Widget
