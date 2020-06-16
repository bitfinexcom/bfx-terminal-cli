'use strict'

const colors = require('colors')

/**
 * Helper that returns a function which can be called multiple times to measure
 * elapsed durations between calls.
 *
 * @memberOf module:Utility
 *
 * @param {boolean} [asString] - default true, if false returned value is the
 *   duration value in ms; otherwise a color formatted string
 * @param {Function} [color] - color function for durations under red threshold
 * @param {number} [redThreshold] - default 300ms, durations exceeding this
 *   value are colored red if `asString` is not false
 * @returns {number[]|string[]} result - array with duration string (%dms) or
 *   value as single element, and modified toString() function returning the
 *   color-formatted string
 * @example
 *   cosnt d = measureDuration(false)
 *
 *   // long-running operations
 *
 *   const first = d()
 *   const [firstDurationMS] = first
 *   const firstDurationString = first.toString()
 *
 *   // second set of operations
 *
 *   const second = d()
 *   const [secondDurationMS] = second
 *   const secondDurationString = second.toString()
 *
 *   // etc
 */
const measureDuration = (
  asString = true,
  color = colors.yellow,
  redThreshold = 300
) => {
  const start = Date.now()

  return () => {
    const d = Date.now() - start
    const str = `${d}ms`
    const formattedString = !asString
      ? d
      : d > redThreshold
        ? colors.red(str)
        : color
          ? color(str)
          : str

    const res = [d]
    res.toString = () => formattedString
    return res
  }
}

module.exports = measureDuration
