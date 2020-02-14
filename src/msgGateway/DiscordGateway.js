const Discord = require('discord.js');

const MsgGateway = require('./MsgGateway');

module.exports = class DiscordGateway extends MsgGateway {
  constructor(config) {
    super();
    const {
      botToken, userWhitelist, commandPrefix, statusChannel,
    } = config;
    if (!botToken || !userWhitelist || !commandPrefix) {
      throw new Error('Invalid configuration. Missing required fields.');
    }
    this.botToken = botToken;
    this.userWhitelist = userWhitelist;
    this.commandPrefix = commandPrefix;
    this.statusChannel = statusChannel;
  }

  init() {
    return new Promise((resolve, reject) => {
      // Create discord client instance
      this.client = new Discord.Client();

      // Register listeners
      this.client.on('error', (error) => this._errorHandler(error, 'error'));
      this.client.on('warn', (error) => this._errorHandler(error, 'warn'));
      this.client.on('message', (message) => this._messageHandler(message));

      // Return when initialized
      this.client.on('ready', () => {
        console.info(`Logged to Discord in as ${this.client.user.tag}!`);
        if (this.statusChannel) {
          this.client.channels.get(this.statusChannel).send('Discord gateway connected.');
        }
        return resolve();
      });

      this.client.login(this.botToken).catch(reject);
    });
  }

  sendMessage(channelId, message) {
    return this.client.channels.get(channelId).send(message);
  }

  // eslint-disable-next-line class-methods-use-this
  _errorHandler(error, level) {
    if (!['debug', 'warn', 'error'].includes(level)) {
      throw new Error('Invalid log level');
    }
    console[level](error);
  }

  _messageHandler(message) {
    // Ignore normal messages, other bots and non whitelisted users
    if (message.author.bot
      || !message.content.startsWith(this.commandPrefix)
      || !this.userWhitelist.includes(message.author.id)) {
      return;
    }

    const args = message.content.split(' ');
    args.shift();
    this.emit('command',
      this.commandPrefix,
      args,
      // Handle reply from command handler
      (reply) => {
        if (typeof reply !== 'string') {
          message.reply(this._jsonToDiscordMsgString(reply));
          return;
        }
        message.reply(reply);
      });
  }

  // eslint-disable-next-line class-methods-use-this
  _jsonToDiscordMsgString(json) {
    try {
      return `\`\`\`json\n${JSON.stringify(json, null, 2)}\n\`\`\``;
    } catch (err) {
      return 'Error while serializing message.';
    }
  }
};
