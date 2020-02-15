const EventEmitter = require('events');

module.exports = class CommandHandler extends EventEmitter {
  constructor(msgGateways, hue, speedTest) {
    super();
    if (!msgGateways || !hue) {
      throw new Error('MsgGateways and PhilipsHue references are mandatory.');
    }
    this.hue = hue;
    this.speedTest = speedTest;
    this.msgGateways = msgGateways;

    this.msgGateways.forEach(
      (gateway) => gateway.on('command', (...args) => this._onCommand(...args)),
    );
  }

  async _onCommand(prefix, args, callback) {
    console.debug('onCommand', { prefix, args, callback });
    if (!args || args.length === 0) {
      callback('Hi, I\'m HomeBot! Available commands: `stop`, `status`, `hue`, `speedtest`');
      return;
    }

    switch (args[0]) {
      case 'stop': {
        callback('Shutting down...');
        this.emit('shutdown');
        return;
      }
      case 'status': {
        callback(await this.hue.getStatusMsg());
        break;
      }
      case 'speedtest': {
        if (!this.speedTest) {
          callback('Speed test module not loaded.');
          break;
        }
        if (this.speedTest.testRunning) {
          callback('Speedtest already running, please wait.');
          break;
        }
        callback('Running speedtest against "fast.com" ...');
        let testResult;
        try {
          testResult = await this.speedTest.runTest();
        } catch (error) {
          callback(`Error while running speedtest: ${error.message}`);
          break;
        }
        callback(`Test result: ${testResult}`);
        break;
      }
      case 'hue': {
        if (args.length === 1) {
          // no hue args
          callback(`${await this.hue.getStatusMsg()}\n Available commands: sensor, togglealarm`);
          break;
        }
        switch (args[1]) {
          case 'sensor': {
            let sensor;
            try {
              sensor = await this.hue.getSensor(args[2]);
            } catch (error) {
              callback(`Error while getting sensor data: ${error.message}`);
              break;
            }
            callback(sensor);
            break;
          }
          case 'togglealarm': {
            this.hue.motionAlarm = !this.hue.motionAlarm;
            callback(`${this.hue.motionAlarm ? 'Enabled' : 'Disabled'} motion alarm!`);
            break;
          }
          case 'temperature': {
            let readings;
            try {
              readings = await this.hue.getTemperatureReadings();
            } catch (error) {
              callback(`Error while getting temperature readings: ${error.message}`);
              break;
            }
            callback(readings);
            break;
          }
          default: {
            callback('Unknown hue command.');
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
