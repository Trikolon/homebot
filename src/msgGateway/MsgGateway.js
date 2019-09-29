/* eslint-disable class-methods-use-this */
const EventEmitter = require('events');

/**
 * Events: command - When the user executes a command
 * @type {MsgGateway}
 */
module.exports = class MsgGateway extends EventEmitter {
  init() {
    throw new Error('Not implemented');
  }

  sendMessage() {
    throw new Error('Not implemented');
  }
};
