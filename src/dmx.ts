//const DMX = require('dmx');     // include the dmx lib
import { DMX, EnttecUSBDMXProDriver } from 'dmx-ts';
import { Logger } from 'homebridge';

export class DmxController {
    private dmx: DMX;
    private log: Logger;
    private static instance: DmxController;
    private universeName = 'dmxLightUniverse';

    // Constructor
    private constructor(serialPort: string, dmxDriverName: string, log: Logger) {
      // Create DMX instance
      this.dmx = new DMX();
      this.log = log;

      log.info('creating DMX universe with driver named ' + dmxDriverName + ' on serial port ' + serialPort);

      // Add the universe
      this.dmx.addUniverse(this.universeName, new EnttecUSBDMXProDriver(serialPort))
        .then(() => {
          log.info('successfully added universe');
        })
        .catch((err) => {
          log.error('error adding universe: ' + err);
        } );

      this.dmx.updateAll(this.universeName, 0);
    }

    public static getInstance(serialPort: string, dmxDriverName: string, log: Logger): DmxController {
      if (!DmxController.instance) {
        DmxController.instance = new DmxController(serialPort, dmxDriverName, log);
      }

      return DmxController.instance;
    }

    setOn(startChannel: number) {
      this.log.info('setting channels ' + startChannel + '-' + (startChannel+2) + ' on');
      const channel = { [startChannel]: 255, [startChannel+1]: 255, [startChannel+2]: 255 };
      this.dmx.update(this.universeName, channel);
    }

    setOff(startChannel: number) {
      this.log.info('setting channels ' + startChannel + '-' + (startChannel+2) + ' off');
      const channel = { [startChannel]: 0, [startChannel+1]: 0, [startChannel+2]: 0 };
      this.dmx.update(this.universeName, channel);
    }

    setHSB(startChannel: number, hue: number, saturation: number, brightness: number) {
      const rgb = this.HSVtoRGB(hue/360, saturation/100, brightness/100);

      this.log.info('setting channels ' + startChannel + '-' + (startChannel+2) + ' to ' + rgb.r + '/' + rgb.g + '/' + rgb.b);

      //const channel = { [startChannel]: rgb[0], [startChannel+1]: rgb[1], [startChannel+2]: rgb[2] };
      let channel = { [startChannel]: rgb.r};
      this.dmx.update(this.universeName, channel);

      channel = { [startChannel+1]: rgb.g};
      this.dmx.update(this.universeName, channel);

      channel = { [startChannel+2]: rgb.b};
      this.dmx.update(this.universeName, channel);

    }

    // quit ensures that everything is turned off
    quit(error) {
      if (error) {
        this.log.error('Uncaught Exception: ' + error.stack);
      }
      this.log.info('Turning off all DMX Light channels...');
      for (let c = 0; c < 256; c++) {
        const channel = { [c]: 0 };       // make an object
        this.dmx.update(this.universeName, channel); // set channel to 0
      }
      // after 0.5 second, quit
      // (allows plenty of time for sending final blackout data):
      setTimeout(process.exit, 500);
    }

    private HSVtoRGB(h: number, s: number, v: number) {
      let r = 0;
      let g = 0;
      let b = 0;

      const i = Math.floor(h * 6);
      const f = h * 6 - i;
      const p = v * (1 - s);
      const q = v * (1 - f * s);
      const t = v * (1 - (1 - f) * s);
      switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
      }

      return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
      };
    }
}