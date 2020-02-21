// This is a thin layer that uses the deltachat-node bindings, and sets up
// listeners to react on events we need to handle in our application.
const config = require('config')
const DeltaChat = require('deltachat-node').default
const { C } = require('deltachat-node')
const log = require('./log')

// Initialize the DC core engine.
const deltachat = new DeltaChat()

// Close the connections and the database when the app exits.
process.on('exit', () => deltachat.close() )


deltachat.start = (handleNewMessageCallback) => {
  // Listen to event about incoming messages for existing chats, and hand the
  // payload over to the handling function.
  deltachat.on('DC_EVENT_INCOMING_MSG', (chatId, messageId) => {
    handleNewMessageCallback(deltachat.getChat(chatId), deltachat.getMessage(messageId))
  })

  // Listen to event to get hands on messages that are not considered part of a
  // chat yet.
  // Background: the core engine puts all messages that don't belong to an
  // existing chat (e.g. an initial message from someone you haven't chatted
  // with yet) into a bucket called "deaddrop". We're checking for that
  // association to filter the wanted messages from others (e.g. Message
  // Delivery Notification, etc.).
  deltachat.on('DC_EVENT_MSGS_CHANGED', (chatId, messageId) => {
    const message = deltachat.getMessage(messageId)
    if (message && message.isDeadDrop()) {
      const realChatId = deltachat.createChatByMessageId(messageId)
      handleNewMessageCallback(deltachat.getChat(realChatId), message)
    }
  })

  // Initialize the app, open the database, start looking for messages, etc.
  // We return a promise because DeltaChat.open() returns early itself, but we
  // want to enable waiting until all is done.
  const dc_init_promise = new Promise((resolve, reject) => {
    log('Initializing deltachat')
    deltachat.open(process.cwd(), (err) => {
      if (err) {
        reject(err)
      }
      // Configure deltachat if required.
      // This happens on first runs (when no database was present before), or
      // when first runs where cancelled before the configuration process was
      // finished.
      if (deltachat.isConfigured()) {
        // This event serves well as indicator that deltachat is probably ready
        // for action.
        deltachat.on("DC_EVENT_IMAP_CONNECTED", () => {
          // Beware: this event gets fired on re-connections, too. Take care to
          // not log messages (like "deltachat is ready") that might cause
          // confusion later on.
          resolve()
        })
      } else {
        // DeltaChat is only ready for action when the configuration is
        // finished. This might happen later than DC_EVENT_IMAP_CONNECTED, thus
        // we listen for this different event here. Before deltachat is ready,
        // e.g. creating QR-codes might fail.
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
