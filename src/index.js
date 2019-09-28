const DiscordGateway = require('./msgGateway/Discord');
const PhilipsHue = require('./homeAPI/PhilipsHue');
const config = require('../config.json');


(async function main() {
  const hue = new PhilipsHue(config.homeAPI.hue);
  try {
    await hue.init();
  } catch (error) {
    console.error('Error while initializing PhilipsHue:', error.message);
  }

  const discord = new DiscordGateway(config.messageGateway.discord);
  try {
    await discord.init();
  } catch (error) {
    console.error('Error while initializing Discord!', error.message);
  }

  const sensorSubChannel = config.messageGateway.discord.subscriptions.sensor;
  if (sensorSubChannel) {
    hue.on('sensor', (sensor) => {
      discord.sendMessage(sensorSubChannel, `**Sensor update** ${sensor.name}: \`\`\`json\n${JSON.stringify(sensor.state)}\n\`\`\``);
    });
  }
}());
