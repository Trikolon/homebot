const readline = require('readline');

const MsgGateway = require('./MsgGateway');

/**
 * Events: command - When the user executes a command
 * @type {MsgGateway}
 */
module.exports = class ConsoleGateway extends MsgGateway {

  init() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    this.rl.on('line', (line) => this._messageHandler(line));

    return Promise.resolve();
  }

  _messageHandler(message) {
    const args = message.split(' ');
    this.emit('command',
      null,
      args,
      // Handle reply from command handler
      (reply) => {
        if (typeof reply !== 'string') {
          this.sendMessage(JSON.stringify(reply, null, 2))
          return;
        }
        this.sendMessage(reply);
      });
  }

  // eslint-disable-next-line class-methods-use-this
  sendMessage(message) {
    console.info(message);
  }
};
