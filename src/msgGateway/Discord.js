const Discord = require('discord.js');

module.exports = class DiscordGateway {
  constructor(config) {
    const { botToken, userWhitelist, commandPrefix } = config;
    if (!botToken || !userWhitelist || !commandPrefix) {
      throw new Error('Invalid configuration. Missing required fields.');
    }
    this.botToken = botToken;
    this.userWhitelist = userWhitelist;
    this.commandPrefix = commandPrefix;
  }

  init() {
    return new Promise((resolve, reject) => {
      // Create discord client instance
      this.client = new Discord.Client();

      // Register listeners
      this.client.on('error', (error) => this._errorHandler(error, 'error'));
      this.client.on('warn', (error) => this._errorHandler(error, 'warn'));
      this.client.on('message', this._messageHandler);

      // Return when initialized
      this.client.on('ready', () => {
        console.info(`Logged to Discord in as ${this.client.user.tag}!`);
        return resolve();
      });

      this.client.login(this.botToken).catch(reject);
    });
  }

  _errorHandler(error, level) {
    if (!['debug', 'warn', 'error'].includes(level)) {
      throw new Error('Invalid log level');
    }
    console[level](error);
  }

  _messageHandler(message) {
    console.debug('New message', message.text);
    // Ignore normal messages, other bots and non whitelisted users
    if (!message.startsWith(this.commandPrefix)
      || message.author.bot
      || !this.userWhitelist.includes(message.author.id)) {
      return;
    }
    message.reply('Hi, youre whitelisted!');
  }
};
