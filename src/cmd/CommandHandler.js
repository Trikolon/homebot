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
    console.debug('onCommand', { prefix, args, callback });
    if (!args || args.length === 0) {
      callback('Hi, I\'m HomeBot! Available commands: `!status`, `!hue`');
      return;
    }

    switch (args[0]) {
      case 'status': {
        callback(await this.hue.getStatusMsg());
        break;
      }
      case 'hue': {
        if (args.length === 1) {
          // no hue args
          callback(await this.hue.getStatusMsg());
          break;
        }
        switch (args[1]) {
          case 'sensor': {
            let sensorData;
            try {
              sensorData = await this.hue.getSensor(args[2]);
            } catch (error) {
              callback(`Error while getting sensor data: ${error.message}`);
              break;
            }
            callback(sensorData);
            break;
          }
          default: {
            callback('Unknown hue command.');
            break;
          }
          case 'togglealarm': {
            this.hue.motionAlarm = !this.hue.motionAlarm;
            callback(`${this.hue.motionAlarm ? 'Enabled' : 'Disabled'} motion alarm!`);
            break;
          }
        }
        break;
      }
      default: {
        callback('Unknown command.');
      }
    }
  }
};
