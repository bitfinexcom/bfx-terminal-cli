'use strict'

const colors = require('colors')

const defineCommandYargs = (y, {
  command,
  description,
  options = {},
  examples = [],
  aliases = [],
  epilogue,
  extra = {},
  handler
}) => (
  y.command({
    command,
    handler,
    aliases,
    describe: colors.green(description),
    builder: yArgs => {
      Object.keys(options).forEach((flag) => {
        const opt = options[flag]

        yArgs.option(flag, {
          ...opt,
          ...(opt.describe ? {
            describe: colors.yellow(opt.describe)
          } : {})
        })
      })

      examples.forEach(([content, ...description]) => {
        yArgs.example(colors.blue(content), colors.yellow(description.join(' ')))
      })

      if (epilogue) {
        yArgs.epilogue(epilogue)
      }

      Object.keys(extra).forEach((func) => {
        yArgs[func](extra[func])
      })
    }
  })
)

module.exports = defineCommandYargs
