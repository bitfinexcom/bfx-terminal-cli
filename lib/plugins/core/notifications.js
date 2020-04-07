'use strict'

const { sprintf } = require('sprintf-js')
const notifier = require('node-notifier')
const _isArray = require('lodash/isArray')
const Plugin = require('../plugin')

/**
 * Provides helpers tied to event listeners to emit desktop notifications,
 * and attaches them to the terminal for alternative access
 */
class NotificationsPlugin extends Plugin {
  /**
   * @param {Terminal} terminal - terminal instance
   */
  constructor (terminal) {
    super('core:notifications', {
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

  /**
   * Attached to the terminal instance
   *
   * @fires NotificationsPlugin~notifyImportant
   *
   * @param {string} title - notification title
   * @param {string} message - notification message
   */
  notifyImportant (title, message) {
    /**
     * Fired when an important notification should be shown on the desktop
     *
     * @event NotificationsPlugin~notifyImportant
     * @property {string} title - notification title
     * @property {string} message - notification message
     */
    this.emitSync('notifyImportant', { title, message })
  }

  /**
   * Attached to the terminal instance
   *
   * @fires NotificationsPlugin~notifySuccess
   *
   * @param {string} title - notification title
   * @param {string} message - notification message
   */
  notifySuccess (title, message) {
    /**
     * Fired when a success notification should be shown on the desktop
     *
     * @event NotificationsPlugin~notifySuccess
     * @property {string} title - notification title
     * @property {string} message - notification message
     */
    this.emitSync('notifySuccess', { title, message })
  }

  /**
   * Attached to the terminal instance
   *
   * @fires NotificationsPlugin~notifyError
   *
   * @param {string} title - notification title
   * @param {string} message - notification message
   */
  notifyError (title, message) {
    /**
     * Fired when an error notification should be shown on the desktop
     *
     * @event NotificationsPlugin~notifyError
     * @property {string} title - notification title
     * @property {string} message - notification message
     */
    this.emitSync('notifyError', { title, message })
  }

  /**
   * Attached to the terminal instance
   *
   * @fires NotificationsPlugin~notify
   *
   * @param {string} title - notification title
   * @param {string} message - notification message
   */
  notify (title, message) {
    /**
     * Fired when generic notification should be shown on the desktop
     *
     * @event NotificationsPlugin~notify
     * @property {string} title - notification title
     * @property {string} message - notification message
     */
    this.emitSync('notify', { title, message })
  }

  /**
   * @private
   * @param {object} data - payload
   * @param {string} data.title - notification title
   * @param {string} data.message - notification message
   */
  onNotifySuccess ({ title, message }) {
    const t = _isArray(title) ? title : [title]
    const m = _isArray(message) ? message : [message]

    this.doNotify({
      title: `Success: ${sprintf(...t)}`,
      message: sprintf(...m)
    })
  }

  /**
   * @private
   * @param {object} data - payload
   * @param {string} data.title - notification title
   * @param {string} data.message - notification message
   */
  onNotifyImportant ({ title, message }) {
    const t = _isArray(title) ? title : [title]
    const m = _isArray(message) ? message : [message]

    this.doNotify({
      title: `Important: ${sprintf(...t)}`,
      message: sprintf(...m)
    })
  }

  /**
   * @private
   * @param {object} data - payload
   * @param {string} data.title - notification title
   * @param {string} data.message - notification message
   */
  onNotifyError ({ title, message }) {
    const t = _isArray(title) ? title : [title]
    const m = _isArray(message) ? message : [message]

    this.doNotify({
      title: `Error: ${sprintf(...t)}`,
      message: sprintf(...m)
    })
  }

  /**
   * @private
   * @param {object} data - payload
   * @param {string} data.title - notification title
   * @param {string} data.message - notification message
   */
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
