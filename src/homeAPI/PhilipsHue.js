const { v3 } = require('node-hue-api');

const { discovery } = v3;
const hueApi = v3.api;

module.exports = class PhilipsHue {
  constructor(config) {
    const {
      ip, appName, deviceName, auth,
    } = config;
    if (!ip || !appName || !deviceName || !auth) {
      throw new Error('Invalid configuration. Missing required fields.');
    }
    this.ip = ip;
    this.appName = appName;
    this.deviceName = deviceName;
    this.auth = auth;

    this.api = null;
  }

  async init() {
    if (this.ip === 'auto') {
      await this._discoverBridge();
      if (this.ip == null) {
        throw new Error('Failed to resolve any Hue Bridges. Try entering the ip manually?');
      }
    }
    if (!this.auth.username || !this.auth.clientkey) {
      console.info('Missing auth credentials, starting bootstrap process.');
      console.info('Please press the Hue bridge button to allow this app to register a user.');
      console.info('Waiting 30 seconds before attempting registration ...');
      await new Promise((resolve) => setTimeout(resolve, 30000));
      await this._createNewUser();
    }
    // Create a new API instance that is authenticated with the new user we created
    this.api = await hueApi.create(this.ip, this.auth.username, this.auth.clientkey);

    // Do something with the authenticated user/api
    const bridgeConfig = await this.api.configuration.get();
    console.info(`Connected to Hue Bridge: ${bridgeConfig.name} :: ${bridgeConfig.ipaddress}`);
  }

  async _discoverBridge() {
    const discoveryResults = await discovery.nupnpSearch();
    if (discoveryResults.length === 0) {
      return;
    }
    // Ignoring that you could have more than one Hue Bridge on a network as this is unlikely
    // in 99.9% of users situations
    this.ip = discoveryResults[0].ipaddress;
  }

  async _createNewUser() {
    if (!this.ip) {
      throw new Error('Missing bridge IP, configure it or run discovery first.');
    }

    // Create an unauthenticated instance of the Hue API so that we can create a new user
    const unauthenticatedApi = await hueApi.create(this.ip);

    let user;
    try {
      user = await unauthenticatedApi.users.createUser(this.appName, this.deviceName);
      console.info('*******************************************************************************\n');
      console.info('User has been created on the Hue Bridge. The following username can be used to\n'
        + 'authenticate with the Bridge and provide full local access to the Hue Bridge.\n'
        + 'YOU SHOULD TREAT THIS LIKE A PASSWORD\n'
        + 'Please add this to the configuration file if you want it to persist.\n');
      console.info('Hue Bridge User:', user);
      console.info('*******************************************************************************\n');
      this.auth.username = user.username;
      this.auth.clientkey = user.clientkey;
    } catch (err) {
      if (err.getHueErrorType() === 101) {
        throw new Error('The Link button on the bridge was not pressed. Please press the Link button and try again.');
      } else {
        throw new Error(`Unexpected Error: ${err.message}`);
      }
    }
  }
};
