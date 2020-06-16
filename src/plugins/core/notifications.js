'use strict'

const { sprintf } = require('sprintf-js')
const notifier = require('node-notifier')
const _isArray = require('lodash/isArray')
const Plugin = require('../plugin')

const SETTING = 'core.notifications-enabled'

/**
 * Provides helpers tied to event listeners to emit desktop notifications,
 * and attaches them to the terminal for alternative access
 */
class NotificationsPlugin extends Plugin {
  /**
   * @param {ModuleHost} host - host instance
   */
  constructor (host) {
    super('core:notifications', {
      host,
      requiredModules: [
        'plugin:core:settings'
      ],

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

      hostMethods: [
        'getNotificationsEnabled',
        'setNotificationsEnabled',
        'notifyImportant',
        'notifySuccess',
        'notifyError',
        'notify'
      ]
    })

    this.notificationsEnabled = 1

    this.getHost().defineSetting({
      key: SETTING,
      type: 'number',
      description: 'Enables desktop notifications if set to 1',
      choices: [0, 1],
      value: this.notificationsEnabled
    })

    this.getHost().subscribeSetting(SETTING, async (value) => {
      this.desktopNotificationsEnabled = value

      if (value) {
        this.getHost().logOutput('Desktop notifications enabled')
        this.notifySuccess({
          title: 'Notifications Enabled',
          message: 'You will receive desktop notifications from now on'
        })
      } else {
        this.getHost().logOutput('Desktop notifications disabled')
      }

      /**
       * Fired when the notifications setting has changed
       *
       * @event NotificationsPlugin~notificationsEnabledUpdated
       * @property {number} value - threshold
       */
      return this.emit('notificationsEnabledUpdated', { value })
    })
  }

  /**
   * Returns the notifications enabled setting value
   *
   * @returns {number} threshold
   */
  getNotificationsEnabled () {
    return this.getHost().getSetting(SETTING)
  }

  /**
   * Update the notifications enabled setting value, and notify if enabled
   *
   * @param {number} v - threshold
   */
  setNotificationsEnabled (v) {
    if (v === this.getNotificationsEnabled()) {
      return
    }

    this.getHost().setSetting(SETTING, v)
  }

  /**
   * Attached to the terminal instance
   *
   * @fires NotificationsPlugin~notifyImportant
   * @alias Terminal#notifyImportant
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
    const enabled = this.getNotificationsEnabled()

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
