# deltachat-node-bot-base

A simple library for building Delta Chat bots.

For further information on DeltaChat bots see <https://bots.delta.chat/>.

### Prerequisites

To build a bot with this library you need to have NodeJS >= 7.6 and NPM installed. Get those from your system's package manager. E.g. on Debian/Ubuntu-based systems: `apt install npm`.

The bot just needs an email-account that it can reach via IMAP and SMTP.


### Installation

Install via npm from the repository:

```bash
npm install --save git://github.com/deltachat-bot/deltachat-node-bot-base
```

### Configuration

Configure the bot by writing its email-address and password into `config/local.json`. E.g.:

```bash
echo '{
"email_address": "bot@example.net",
"email_password": "secretandsecure"
}' > config/local.json
```

### Usage

Here's some example code that gives you an idea:

```javascript
const { deltachat, log } = require('deltachat-node-bot-base')

// Start the deltachat core engine and handle incoming messages.
deltachat.start((chat, message) => {
  const messageText = message.getText()
  log(`Received a message for chat ${chat.getName()}: ${messageText}`)

  if (deltachat.getChatContacts(chat.getid()).size === 1) {
    // This is a 1-on-1 (aka "single") chat.
    // Reply by quoting the same text.
    deltachat.sendMessage(chat.getId(), `You said: ${messageText}`)
  } else if (messageText.match(/bot[:, ]+/)) {
    // Reply to a group chat only if the message started with "Bot".
    const contact = deltachat.getContact(message.getFromId())
    const displayName = contact.getDisplayName()
    deltachat.sendMessage(chat.getId(), `${displayName} said: ${messageText}`)
  }
}
```
