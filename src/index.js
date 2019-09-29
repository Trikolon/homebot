const DiscordGateway = require('./msgGateway/Discord');
const PhilipsHue = require('./homeAPI/PhilipsHue');
const config = require('../config.json');


(async function main() {
  const hue = new PhilipsHue(config.homeAPI.hue);
  const discord = new DiscordGateway(config.messageGateway.discord);

  Promise.all([hue.init(), discord.init()])
    .then(() => {
      const sensorSubChannel = config.messageGateway.discord.subscriptions.sensor;
      if (sensorSubChannel) {
        hue.on('sensor', (sensor) => {
          discord.sendMessage(sensorSubChannel, `**Sensor update** ${sensor.name}: \`\`\`json\n${JSON.stringify(sensor.state)}\n\`\`\``);
        });
      }
    })
    .catch((error) => {
      console.error('Error while initialising!', error.message);
      console.debug(error);
    });
}());
