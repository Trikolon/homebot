const DiscordGateway = require('./msgGateway/DiscordGateway');
const ConsoleGateway = require('./msgGateway/ConsoleGateway');
const PhilipsHue = require('./homeAPI/PhilipsHue');
const CommandHandler = require('./cmd/CommandHandler');
const config = require('../config.json');

const locale = config.locale || 'en-US';

(async function main() {
  const hue = new PhilipsHue(config.homeAPI.hue);
  const discordGateway = new DiscordGateway(config.messageGateway.discord);
  const consoleGateway = new ConsoleGateway();
  const commandHandler = new CommandHandler([discordGateway, consoleGateway], hue);

  Promise.all([hue.init(), discordGateway.init(), consoleGateway.init()])
    .then(() => {
      const sensorSubChannel = config.messageGateway.discord.subscriptions.sensor;
      if (sensorSubChannel) {
        hue.on('sensor', (sensor) => {
          discordGateway.sendMessage(sensorSubChannel, `**Sensor update** ${sensor.name}: \`\`\`json\n${JSON.stringify(sensor.state)}\n\`\`\``);
        });
      }
      const motionSubChannel = config.messageGateway.discord.subscriptions.motion;
      hue.on('motion', (sensor) => {
        discordGateway.sendMessage(motionSubChannel,
          `**Motion detected!**\n**Sensor**: ${sensor.name}\n**Time**: ${new Date(sensor.state.lastupdated).toLocaleString(locale)}\n@everyone`);
      });
    })
    .catch((error) => {
      console.error('Error while initialising!', error.message);
      console.debug(error);
    });
}());
