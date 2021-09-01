//const DMX = require('dmx');     // include the dmx lib
import { DMX, EnttecUSBDMXProDriver } from 'dmx-ts';
import { Logger } from 'homebridge';
import { Client } from 'e131';

export class DmxController {
    private dmx: DMX;
    private log: Logger;
    private static instance: DmxController;
    private universeName = 'dmxLightUniverse';
    private sacnClient: Client;
    private sacnSlotsData: unknown;

    // Constructor
    private constructor(serialPort: string, ipAddress: string, log: Logger) {
      this.log = log;

      // Configure Enttec Pro
      this.dmx = new DMX();

      if (serialPort !== null && serialPort !== '') {
        this.dmx.addUniverse(this.universeName, new EnttecUSBDMXProDriver(serialPort))
          .then(() => {
            log.info('successfully added universe');
          })
          .catch((err) => {
            log.error('error adding universe: ' + err);
          } );
      }

      // Configure Streaming ACN
      if (ipAddress !== '') {
        this.sacnClient = new Client(ipAddress);
      } else {
        this.sacnClient = new Client('localhost');
      }
    }

    public static getInstance(serialPort: string, ipAddress: string, log: Logger): DmxController {
      if (!DmxController.instance) {
        DmxController.instance = new DmxController(serialPort, ipAddress, log);
      }

      return DmxController.instance;
    }

    setOn(driverName: string, universeNumber: number, startChannel: number, channelCount: number) {
      this.log.info('Set On (Universe #' + universeNumber + ', Channels #' + startChannel + '-' + (startChannel + channelCount) + ')');

      switch (driverName) {
        case 'enttec-usb-dmx-pro':
          this.log.info('setting channels ' + startChannel + '-' + (startChannel+2) + ' on');
          // eslint-disable-next-line no-case-declarations
          const channel = { [startChannel]: 255, [startChannel+1]: 255, [startChannel+2]: 255 };
          this.dmx.update(this.universeName, channel);
          break;
        case 'sacn':
          this.setSacnColor(universeNumber, startChannel, channelCount, 255, 255, 255);
          break;
      }
    }

    setOff(driverName: string, universeNumber: number, startChannel: number, channelCount: number) {
      this.log.info('Set Off (Universe #' + universeNumber + ', Channels #' + startChannel + '-' + (startChannel + channelCount) + ')');

      switch (driverName) {
        case 'enttec-usb-dmx-pro':
          // eslint-disable-next-line no-case-declarations
          const channel = { [startChannel]: 0, [startChannel+1]: 0, [startChannel+2]: 0 };
          this.dmx.update(this.universeName, channel);
          break;
        case 'sacn':
          this.setSacnColor(universeNumber, startChannel, channelCount, 0, 0, 0);
          break;
      }


    }

    setSacnColor(universeNumber: number, startChannel: number, channelCount: number, r: number, g: number, b: number) {
      const sacnPacket = this.sacnClient.createPacket(channelCount + startChannel);
      sacnPacket.setSourceName('DMXLightPlugin');
      sacnPacket.setUniverse(universeNumber);
      const sacnSlotsData = sacnPacket.getSlotsData();
      sacnPacket.setSourceName('RemotePixel');
      sacnPacket.setUniverse(universeNumber);

      let p = 1;
      for (let idx = startChannel-1; idx < sacnSlotsData.length; idx++) {
        switch (p) {
          case 1:
            sacnSlotsData[idx] = r;
            break;
          case 2:
            sacnSlotsData[idx] = g;
            break;
          case 3:
            sacnSlotsData[idx] = b;
            break;
        }

        p++;
        if (p > 3) {
          p = 1;
        }
      }

      this.sacnClient.send(sacnPacket);
    }

    setHSB(driverName: string, universeNumber: number, startChannel: number, channelCount: number, colorOrder: string,
      hue: number, saturation: number, brightness: number) {
      const rgb = this.HSVtoRGB(hue/360, saturation/100, brightness/100);
      //this.log.info('setting channels ' + startChannel + '-' + (startChannel+2) + ' to ' + rgb.r + '/' + rgb.g + '/' + rgb.b);
      this.log.info('Set Color: HSV=' + hue/360 + '/' + saturation/100 + '/' + brightness/100 + ', RGB=' + rgb.r + '/' +
      rgb.g + '/' + rgb.b + ' (Universe #' + universeNumber + ', Channels #' + startChannel + '-' + (startChannel + channelCount) + ')');

      // Remap colors if necessary
      const colors: number[] = [ ];

      if (colorOrder !== 'rgb') {
        for (let i = 0; i < colorOrder.length; i++) {
          switch (colorOrder[i]) {
            case 'r':
              colors[i] = rgb.r;
              break;
            case 'g':
              colors[i] = rgb.g;
              break;
            case 'b':
              colors[i] = rgb.b;
              break;
          }
        }
      }

      switch (driverName) {
        case 'enttec-usb-dmx-pro':
          // eslint-disable-next-line no-case-declarations
          let channel = { [startChannel]: colors[0]};
          this.dmx.update(this.universeName, channel);

          channel = { [startChannel+1]: colors[1]};
          this.dmx.update(this.universeName, channel);

          channel = { [startChannel+2]: colors[2]};
          this.dmx.update(this.universeName, channel);
          break;
        case 'sacn':
          this.setSacnColor(universeNumber, startChannel, channelCount, colors[0], colors[1], colors[2]);
          break;
      }
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