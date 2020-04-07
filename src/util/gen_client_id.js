'use strict'
// @flow

let last: number = Date.now()

module.exports = (): number => {
  const now = Date.now()
  last = (last < now) ? now : last + 1
  return last
}
