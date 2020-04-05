'use strict'

const { sprintf } = require('sprintf-js')
const notifier = require('node-notifier')
const _isArray = require('lodash/isArray')
const Plugin = require('./plugin')

class NotificationsPlugin extends Plugin {
  constructor (terminal) {
    super('notifications', {
      terminal,
      providedHooks: [
        'notifyImportant',
        'notifySuccess',
        'notifyError',
        'notify'
      ],

      hooks: {
        notifyImportant: 'onNotifyImportant',
        notifySuccess: 'onNotifySuccess',
        notifyError: 'onNotifyError',
        notify: 'notify'
      },

      terminalMethods: [
        'notifyImportant',
        'notifySuccess',
        'notifyError',
        'notify'
      ]
    })
  }

  notifyImportant (title, message) {
    this.emit('notifyImportant', { title, message })
  }

  notifySuccess (title, message) {
    this.emit('notifySuccess', { title, message })
  }

  notifyError (title, message) {
    this.emit('notifyError', { title, message })
  }

  notify (title, message) {
    this.emit('notify', { title, message })
  }

  onNotifySuccess ({ title, message }) {
    const t = _isArray(title) ? title : [title]
    const m = _isArray(message) ? message : [message]

    this.doNotify({
      title: `Success: ${sprintf(...t)}`,
      message: sprintf(...m)
    })
  }

  onNotifyImportant ({ title, message }) {
    const t = _isArray(title) ? title : [title]
    const m = _isArray(message) ? message : [message]

    this.doNotify({
      title: `Important: ${sprintf(...t)}`,
      message: sprintf(...m)
    })
  }

  onNotifyError ({ title, message }) {
    const t = _isArray(title) ? title : [title]
    const m = _isArray(message) ? message : [message]

    this.doNotify({
      title: `Error: ${sprintf(...t)}`,
      message: sprintf(...m)
    })
  }

  doNotify ({ title, message }) {
    const enabled = this.getTerminal().getNotificationsEnabled()

    if (!enabled) {
      return
    }

    notifier.notify({
      title,
      message
    })
  }
}

module.exports = NotificationsPlugin
