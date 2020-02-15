const FastSpeedtest = require('fast-speedtest-api');

module.exports = class SpeedTest {
  constructor({
    token, verbose = false, timeout = 10000, https = true,
    urlCount = 5, bufferSize = 8, unit = FastSpeedtest.UNITS.Mbps,
  }) {
    if (!token) {
      throw new Error('Missing fast.com token.');
    }
    this.test = new FastSpeedtest({
      token,
      verbose,
      timeout,
      https,
      urlCount,
      bufferSize,
      unit,
    });
    this.testRunning = false;
  }

  _unitToString() {
    const unitKeys = Object.keys(FastSpeedtest.UNITS);
    for (let i = 0; i < unitKeys.length; i += 1) {
      if (FastSpeedtest.UNITS[unitKeys[i]] === this.test.unit) {
        return unitKeys[i];
      }
    }
    // Unit key not found
    return '';
  }

  async runTest() {
    this.testRunning = true;
    let testResult;
    try {
      testResult = await this.test.getSpeed();
    } catch (error) {
      this.testRunning = false;
      throw error;
    }
    this.testRunning = false;
    return `Download: ${testResult} ${this._unitToString()}`;
  }
};
