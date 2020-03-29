#!/usr/bin/env node
'use strict'

require('dotenv').config()
require('bfx-hf-util/lib/catch_uncaught_errors')

const Promise = require('bluebird')

Promise.config({ cancellation: true })

const yArgs = require('yargs/yargs')
const commands = require('./lib/commands')

const y = yArgs(process.argv.slice(2))
  .scriptName('vth-bfx-tg-bot')
  .usage('Usage: vth-bfx-tg-bot [command] <options>')

commands.forEach(cmd => y.command(cmd))

y
  .demandCommand(1, 'A command is required')
  .strictCommands()
  .parse()
