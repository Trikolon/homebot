module.exports = class CommandHandler {
  constructor(msgGateway, hue) {
    if (!msgGateway || !hue) {
      throw new Error('MsgGateway and PhilipsHue references are mandatory.');
    }
    this.hue = hue;
    this.msgGateway = msgGateway;

    msgGateway.on('command', (...args) => this._onCommand(...args));
  }

  async _onCommand(prefix, args, callback) {
    console.debug('onCommand', {prefix, args, callback});
    if (!args || args.length === 0) {
      callback('Hi, I\'m HomeBot! Available commands: !status');
      return;
    }

    switch (args[0]) {
      case 'status': {
        callback(await this.hue.getStatusMsg());
        break;
      }
      default: {
        callback('Unknown command.');
      }
    }
  }
};
