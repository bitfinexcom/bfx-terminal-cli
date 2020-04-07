'use strict'

require('colors')

const yArgs = require('yargs/yargs')
const blessed = require('blessed')
const Widget = require('./widget')

/**
 * Provides a textarea where the user may enter input, and passes its contents
 * on `<return>` press to a `yArgs` instance built from all available command
 * modules.
 *
 * @extends Widget
 */
class TerminalInputWidget extends Widget {
  constructor (host, { geo }) {
    super('terminal-input', {
      geo,
      host,
      unique: true,
      element: blessed.textarea,
      elementOptions: {
        label: 'Console Input',
        inputOnFocus: true,
        style: {
          border: { fg: 'white' },
          focus: {
            border: { fg: 'green' }
          }
        }
      },

      hooks: {
        hostBootFinished: 'onHostBootFinished'
      }
    })

    this.getElement().setValue('Awaiting startup completion...')
    this.render()
  }

  /**
   * Focuses the textarea and binds the `'enter'` keypress listener
   *
   * @listens ModuleHost~hostBootFinished
   * @private
   */
  onHostBootFinished () {
    const self = this
    const elm = self.getElement()

    elm.enableMouse()
    elm.key('enter', function () {
      self.onSubmitInput(this.getValue()).catch((error) => {
        self.getHost().logOutput('Input error: %s', error.message)
      })

      this.clearValue()
      self.render()
    })

    elm.clearValue('')
    elm.focus()
    this.render()
  }

  /**
   * Creates a yArgs instance with all loaded commands, and passes the parsed
   * input to it for execution, logging output or any errors to the console
   *
   * @todo refactor to cache commands/yargs, for now quick migration from old
   *   monolithic Terminal
   * @private
   * @async
   *
   * @param {string} value - input value
   * @returns {Promise} p - resolves on completion
   */
  async onSubmitInput (value) {
    const input = value.trim()
    const host = this.getHost()

    host.logOutput(`> ${input.gray}`)

    let y = yArgs(input)
      .scriptName('')
      .exitProcess(false)
      .showHelpOnFail(false)
      .help(false)
      .version(false)
      .fail((output, err) => {
        throw (err || new Error(output))
      })

    host.getCommands().forEach(cmd => { y = cmd.attachYArgs(y) })

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
            host.logOutput('%s', l)
          })
        })
      } else {
        host.logOutput('%s'.red, e.message)
      }
    }
  }
}

module.exports = TerminalInputWidget
