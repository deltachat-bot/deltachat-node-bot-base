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
   */
  deltachat.open(process.cwd(), () => {
    if (!deltachat.isConfigured()) {
      log("First time run: Configuring deltachat.")
      deltachat.configure({
        addr: config.get('email_address'),
        mail_pw: config.get('email_password')
      })
    }
    log('Initialization done')
  })
}

module.exports = deltachat
