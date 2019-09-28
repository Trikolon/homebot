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
}());
