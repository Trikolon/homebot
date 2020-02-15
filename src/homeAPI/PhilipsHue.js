const { v3 } = require('node-hue-api');
const EventEmitter = require('events');

const { discovery } = v3;
const hueApi = v3.api;

module.exports = class PhilipsHue extends EventEmitter {
  constructor(config) {
    super();
    const {
      ip, appName, deviceName, auth, sensors,
    } = config;
    if (!ip || !appName || !deviceName || !auth || !sensors) {
      throw new Error('Invalid configuration. Missing required fields.');
    }
    this.ip = ip;
    this.appName = appName;
    this.deviceName = deviceName;
    this.auth = auth;
    this.sensorCfg = sensors;

    this.api = null;

    this.pollSensors = {};
    this.sensorCfg.pollSensorIds.forEach((id) => {
      this.pollSensors[id] = {};
    });


    this.on('newListener', (event) => {
      console.debug('newListener', event);
      if (event === 'sensor') {
        this._sensorPolling(true);
      }
    });

    this.on('removeListener', (event) => {
      console.debug('removeListener', event);
      if (event === 'sensor' && this.listenerCount('sensor') === 0) {
        this._sensorPolling(false);
      }
    });

    // Initially, only register self listener if motion alarm is enabled and sensors are configured.
    // This prevents unnecessary polling.
    const { motionAlarm } = this.sensorCfg;
    this.motionAlarm = motionAlarm.enabled && motionAlarm.sensorIds.length > 0;
  }

  set motionAlarm(state) {
    // Setting the same state is a no-op
    if (this._motionAlarmEnabled === state) {
      return;
    }
    if (state) {
      this.on('sensor', this._motionListener);
    } else {
      this.removeListener('sensor', this._motionListener);
    }
    this._motionAlarmEnabled = state;
  }

  get motionAlarm() {
    return this._motionAlarmEnabled;
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
    this.api = await hueApi.createLocal(this.ip).connect(this.auth.username);

    // Log connection status
    console.info(await this.getStatusMsg());
  }

  async getStatusMsg() {
    if (!this.api) {
      return 'Not connected';
    }
    const bridgeConfig = await this.api.configuration.getConfiguration();
    return `Connected to Hue Bridge: ${bridgeConfig.name} :: ${bridgeConfig.ipaddress}`;
  }

  // Returns sensor data (read only)
  async getSensor(id) {
    if (!this.api) {
      return null;
    }
    const sensorObject = await this.api.sensors.getSensor(id);
    return sensorObject && sensorObject.getJsonPayload();
  }

  /**
   * Discovers all connected temperature sensors and returns their current readings
   * @returns {Promise<void>}
   */
  async getTemperatureReadings() {
    if (!this.api) {
      return null;
    }
    const sensors = await this.api.sensors.getAll();
    return sensors.map((sensor) => sensor && sensor.getJsonPayload())
      .filter((sensor) => sensor != null && (sensor.type === 'ZLLTemperature' || sensor.type === 'CLIPTemperature'))
      .map((tempSensor) => ({
        name: tempSensor.name,
        temperature: tempSensor.state && tempSensor.state.temperature / 100,
        lastupdated: tempSensor.state && tempSensor.state.lastupdated,
      }));
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

  _motionListener(sensor) {
    if (sensor.state.presence && this.sensorCfg.motionAlarm.sensorIds.includes(sensor.id)) {
      this.emit('motion', sensor);
    }
  }

  async _createNewUser() {
    if (!this.ip) {
      throw new Error('Missing bridge IP, configure it or run discovery first.');
    }

    // Create an unauthenticated instance of the Hue API so that we can create a new user
    const unauthenticatedApi = await hueApi.createLocal(this.ip).connect();

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
      if (err.getHueErrorType && err.getHueErrorType() === 101) {
        throw new Error('The Link button on the bridge was not pressed. Please press the Link button and try again.');
      } else {
        throw new Error(`Unexpected Error: ${err.message}`);
      }
    }
  }

  _sensorPolling(status) {
    if (!status && this._sensorPollingInterval) {
      console.debug('Stopping sensor polling');
      clearInterval(this._sensorPollingInterval);
      this._sensorPollingInterval = null;
      return;
    }
    if (this._sensorPollingInterval) {
      // Already started
      return;
    }
    console.debug('Starting sensor polling');
    this._sensorPollingInterval = setInterval(() => {
      Object.entries(this.pollSensors).forEach(async ([sensorId, pollSensor]) => {
        const sensor = await this.getSensor(sensorId);
        if (!sensor) {
          console.warn('Could not find sensor by id', sensorId);
          console.warn('Removing it from poll list');
          delete this.pollSensors[sensorId];
          return;
        }
        if (pollSensor && pollSensor.state
          && pollSensor.state.lastupdated === sensor.state.lastupdated) {
          // Skip already emitted sensor values
          return;
        }
        this.pollSensors[sensorId].state = sensor.state;
        this.emit('sensor', sensor);
      });
    }, this.sensorCfg.sensorPollRate);
  }
};
