'use strict'

/**
 * Terminal Command YArgs Definition
 *
 * @typedef {object} CommandYargsDefinition
 * @property {string} command - command string, i.e. 'buy [amount]'
 * @property {string} description - command description
 * @property {string} [epilogue] - optional text to show at end of help
 * @property {object} [extra] - optional, map of custom methods and their
 *   arguments to call on the yArgs object when building the command
 * @property {object} [options] - map of option flags and their builder objects
 * @property {string[]} [aliases] - array of command aliases
 * @property {string[]} [examples] - array of examples
 */
