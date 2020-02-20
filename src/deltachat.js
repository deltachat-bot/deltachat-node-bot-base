/**
 * This is a thin layer that uses the deltachat-node bindings, and sets up
 * listeners to react on events we need to handle in our application.
 */
const config = require('config')
const DeltaChat = require('deltachat-node').default
const { C } = require('deltachat-node')
const log = require('./log')

// Initialize the DC core engine.
const deltachat = new DeltaChat()

/**
 * Close the connections and the database when the app exits.
 */
process.on('exit', () => deltachat.close() )


deltachat.start = (handleNewMessageCallback) => {
  /**
   * Listen to event about incoming messages, and hand the payload over to the
   * handling function.
   */
  deltachat.on('DC_EVENT_INCOMING_MSG', (chatId, messageId) => {
    //log(`Received DC_EVENT_INCOMING_MSG with args: ${chatId}, ${messageId}`)
    handleNewMessageCallback(deltachat.getChat(chatId), deltachat.getMessage(messageId))
  })

  /**
   * Listen to this event, too, in order to not miss messages from a completely
   * unknown sender.
   * This works around the behaviour of deltachat-core-rust that doesn't fire the
   * event DC_EVENT_INCOMING_MSG if the sender is unknown to the client (the core
   * considers this message to be part of the "deaddrop").
   */
  deltachat.on('DC_EVENT_MSGS_CHANGED', (chatId, messageId) => {
    //log(`Received DC_EVENT_MSGS_CHANGED with args: ${chatId}, ${messageId}`)
    const message = deltachat.getMessage(messageId)
    if (message && message.isDeadDrop()) {
      const realChatId = deltachat.createChatByMessageId(messageId)
      handleNewMessageCallback(deltachat.getChat(realChatId), message)
    }
  })

  /**
   * Initialize the app, open the database, start looking for messages, etc.
   * We return a promise because DeltaChat.open() returns early itself, but we
   * want to enable waiting until all is done.
   */
  const dc_init_promise = new Promise((resolve, reject) => {
    log('Initializing deltachat')
    deltachat.open(process.cwd(), (err) => {
      if (err) {
        reject(err)
      }
      if (deltachat.isConfigured()) {
        // As soon as it is connect, DC is ready for action.
        deltachat.on("DC_EVENT_IMAP_CONNECTED", () => {
          // Beware: this event gets fired on re-connections, too. Better not log anything, it might be confusing.
          resolve()
        })
      } else {
        // DeltaChat is only ready when the configuration is finished. This is later than DC_EVENT_IMAP_CONNECTED, thus we don't rely on it here.
        log('Configuring deltachat...')
        deltachat.on("DC_EVENT_CONFIGURE_PROGRESS", (progress, _) => {
          if (progress === 1000) {
            log("Configuration finished, deltachat is ready")
            resolve()
          }
        })
        deltachat.configure({
          addr: config.get('email_address'),
          mail_pw: config.get('email_password')
        })
      }
    })
  })

  return dc_init_promise
}

module.exports = deltachat
