//const DMX = require('dmx');     // include the dmx lib
import { DMX, EnttecUSBDMXProDriver } from 'dmx-ts';
import { Logger } from 'homebridge';
import { Client } from 'e131';
import { SacnUniverse } from './sacnUniverse';
import Gradient from 'javascript-color-gradient';
import shuffle from 'shuffle-array';

export class DmxController {
    private dmx: DMX;
    private log: Logger;
    private static instance: DmxController;
    private universeName = 'dmxLightUniverse';
    private sacnClient: Client;
    private sacnUniverseMap: { [id: number]: SacnUniverse } = {};
    private updateInterval = 100;

    // Constructor
    private constructor(serialPort: string, ipAddress: string, universe: number, driverName: string, log: Logger) {
      this.log = log;

      // Configure Enttec Pro
      this.dmx = new DMX();

      if (serialPort !== '') {
        this.dmx.addUniverse(this.universeName, new EnttecUSBDMXProDriver(serialPort))
          .then(() => {
            log.info('successfully added universe for Enttec Pro');
          })
          .catch((err) => {
            log.error('error adding universe for Enttec Pro: ' + err);
          } );
      }

      // Configure Streaming ACN
      if (ipAddress !== '') {
        this.sacnClient = new Client(ipAddress);
      } else {
        this.sacnClient = new Client('localhost');
      }

      this.log.info('Added accessory (' + driverName + ') at ' + serialPort + ipAddress + ' on universe #' + universe);
    }

    public static getInstance(serialPort: string, ipAddress: string, universe: number, driverName: string, log: Logger): DmxController {
      if (!DmxController.instance) {
        DmxController.instance = new DmxController(serialPort, ipAddress, universe, driverName, log);
      }

      // Initialize SACN Universe if necessary
      if (driverName === 'sacn') {
        DmxController.instance.sacnUniverseMap[universe] = new SacnUniverse(DmxController.instance.sacnClient, universe, log);
      }

      return DmxController.instance;
    }

    setOn(driverName: string, universeNumber: number, startChannel: number, channelCount: number, colorOrder: string,
      hue: number, saturation: number, brightness: number, transitionEffect: string, transitionEffectDuration: number) {

      const rgb = this.HSVtoRGB(hue/360, saturation/100, brightness/100);

      this.log.info('DMX On with Color: HSV=' + hue + '/' + saturation + '%/' + brightness + '%, RGB=' + rgb.r + '/' +
      rgb.g + '/' + rgb.b + ' (Universe #' + universeNumber + ', Channels #' + startChannel + '-' + (startChannel +
        channelCount - 1) + ', transition=' + transitionEffect + ', duration=' + transitionEffectDuration + ')');

      // Remap colors if necessary
      const colors = this.mapColors(rgb.r, rgb.g, rgb.b, colorOrder);

      // If colors are all off then we need to change them to all on
      if (colors[0] + colors[1] + colors[2] === 0) {
        colors[0] = 255;
        colors[1] = 255;
        colors[2] = 255;
      }

      switch (driverName) {
        case 'enttec-usb-dmx-pro':
          this.log.info('setting channels ' + startChannel + '-' + (startChannel+2) + ' on');
          // eslint-disable-next-line no-case-declarations
          const channel = { [startChannel]: colors[0], [startChannel+1]: colors[1], [startChannel+2]: colors[2] };
          this.dmx.update(this.universeName, channel);
          break;
        case 'sacn':
          switch (transitionEffect.toLocaleLowerCase()) {
            case 'gradient':
              this.applyGradientTransition(universeNumber, startChannel, channelCount, colors[0], colors[1], colors[2],
                transitionEffectDuration, colorOrder);
              break;
            case 'random':
              this.applyRandomTransition(universeNumber, startChannel, channelCount, colors[0], colors[1], colors[2],
                transitionEffectDuration);
              break;
            case 'chase':
              this.applyChaseTransition(universeNumber, startChannel, channelCount, colors[0], colors[1], colors[2],
                transitionEffectDuration);
              break;
            default:
              this.setSacnColor(universeNumber, startChannel, channelCount, colors[0], colors[1], colors[2]);
          }
          break;
      }
    }

    setOff(driverName: string, universeNumber: number, startChannel: number, channelCount: number, colorOrder: string,
      transitionEffect: string, transitionEffectDuration: number) {
      this.log.info('DMX Off (Universe #' + universeNumber + ', Channels #' + startChannel + '-' + (startChannel + channelCount - 1) + ')');

      switch (driverName) {
        case 'enttec-usb-dmx-pro':
          // eslint-disable-next-line no-case-declarations
          const channel = { [startChannel]: 0, [startChannel+1]: 0, [startChannel+2]: 0 };
          this.dmx.update(this.universeName, channel);
          break;
        case 'sacn':
          switch (transitionEffect.toLocaleLowerCase()) {
            case 'gradient':
              this.applyGradientTransition(universeNumber, startChannel, channelCount, 0, 0, 0, transitionEffectDuration, colorOrder);
              break;
            case 'random':
              this.applyRandomTransition(universeNumber, startChannel, channelCount, 0, 0, 0, transitionEffectDuration);
              break;
            case 'chase':
              this.applyChaseTransition(universeNumber, startChannel, channelCount, 0, 0, 0, transitionEffectDuration);
              break;
            default:
              this.setSacnColor(universeNumber, startChannel, channelCount, 0, 0, 0);
          }
          break;
      }
    }

    setHSB(driverName: string, universeNumber: number, startChannel: number, channelCount: number, colorOrder: string,
      hue: number, saturation: number, brightness: number) {

      const rgb = this.HSVtoRGB(hue/360, saturation/100, brightness/100);

      this.log.info('Set Color: HSV=' + hue + '/' + saturation + '%/' +
      brightness + '%, RGB=' + rgb.r + '/' + rgb.g + '/' + rgb.b + ' (Universe #' + universeNumber +
      ', Channels #' + startChannel + '-' + (startChannel + channelCount - 1) + ')');

      // Remap colors if necessary
      const colors = this.mapColors(rgb.r, rgb.g, rgb.b, colorOrder);

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

    private setSacnColor(universeNumber: number, startChannel: number, channelCount: number, r: number, g: number, b: number) {
      const endChannel = startChannel-1 + channelCount-1;
      //this.log.info('Updating slots buffer from ' + (startChannel-1) + ' - ' + endChannel);
      //this.log.info('Color set to ' + r + '/' + g + '/' + b);

      let p = 1;
      for (let idx = startChannel-1; idx <= endChannel; idx++) {
        switch (p) {
          case 1:
            this.sacnUniverseMap[universeNumber].sacnSlotsData[idx] = r;
            break;
          case 2:
            this.sacnUniverseMap[universeNumber].sacnSlotsData[idx] = g;
            break;
          case 3:
            this.sacnUniverseMap[universeNumber].sacnSlotsData[idx] = b;
            break;
        }

        p++;
        if (p > 3) {
          p = 1;
        }
      }

      this.sacnClient.send(this.sacnUniverseMap[universeNumber].sacnPacket);
    }

    // applyGradientTransition creates a smooth transition from one color to the next by utilizing a gradient of colors
    private applyGradientTransition(universeNumber: number, startChannel: number, channelCount: number, r: number, g: number, b:
      number, durationMs: number, colorOrder: string) {
      const currentColor = this.getCurrentColor(universeNumber, startChannel, colorOrder);
      const currentColorStr = this.rgbToColorString(currentColor[0], currentColor[1], currentColor[2]);
      const finalColorStr = this.rgbToColorString(r, g, b);

      const colorPoints = Math.round(durationMs/this.updateInterval);

      const gradientColors = new Gradient();
      gradientColors.setColorGradient(currentColorStr, finalColorStr);
      gradientColors.setMidpoint(colorPoints);
      const colors = gradientColors.getColors();

      const colToStringArray = this.colorStringToArray;
      let colorIndex = 0;
      const interval = this.updateInterval;
      const timerId = setInterval(() => {
        const rgb = colToStringArray(colors[colorIndex]);
        this.setSacnColor(universeNumber, startChannel, channelCount, rgb[0], rgb[1], rgb[2]);
        colorIndex += 1;

        if (colorIndex >= colors.length) {
          clearTimeout(timerId);
          return;
        }
      }, interval);
    }

    // applyRandomTransition transitions each light to the desired color one at a time in a random order
    private applyRandomTransition(universeNumber: number, startChannel: number, channelCount: number, r: number, g: number, b: number,
      durationMs: number) {
      const switchOrder = this.createRandomColorSwitchOrder(channelCount);
      const timeInterval = Math.round(durationMs/switchOrder.length);
      let index = 0;

      const timerId = setInterval(() => {
        this.setSacnColor(universeNumber, switchOrder[index], 3, r, g, b);
        index += 1;

        if (index >= switchOrder.length) {
          clearTimeout(timerId);
          return;
        }
      }, timeInterval);
    }

    // applyChaseTransition transitions each light to the desired color one at a time from beginning to end
    private applyChaseTransition(universeNumber: number, startChannel: number, channelCount: number, r: number, g: number, b: number,
      durationMs: number) {
      const timeInterval = Math.round(durationMs/(channelCount/3));
      let channelIndex = 0;

      const timerId = setInterval(() => {
        this.setSacnColor(universeNumber, (startChannel + channelIndex), 3, r, g, b);
        channelIndex += 3;

        if (channelIndex >= channelCount) {
          clearTimeout(timerId);
          return;
        }
      }, timeInterval);
    }

    // createRandomColorSwitchOrder creates a random order of lights to change color
    private createRandomColorSwitchOrder(lightCount: number) {
      const order: number[] = [];

      // Create an array with the indexes for all lights. Since each light has three channels we need to skip two
      for (let i=1; i <= lightCount; i+=3) {
        order.push(i);
      }

      // Shuffle the array randomly
      shuffle(order);

      return order;
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

    // mapColors maps standard rgb color order to something else
    private mapColors(r: number, g: number, b:number, colorOrder: string) {
      const colors: number[] = [ r, g, b ];

      if (colorOrder !== 'rgb') {
        for (let i = 0; i < colorOrder.length; i++) {
          switch (colorOrder[i]) {
            case 'r':
              colors[i] = r;
              break;
            case 'g':
              colors[i] = g;
              break;
            case 'b':
              colors[i] = b;
              break;
          }
        }
      }

      return colors;
    }

    // colorStringToArray converts a color string in the format of "#3F2CAF" to an array of integers: [127, 32, 234]
    private colorStringToArray(colorHexString: string) {

      const result: Array<number> = [];

      if (colorHexString.length !== 7) {
        return result;
      }

      function hexToDecimal(hex: string) {
        return parseInt(hex, 16);
      }
      try {
        return [hexToDecimal(colorHexString.substring(1, 3)), hexToDecimal(colorHexString.substring(3, 5)),
          hexToDecimal(colorHexString.substring(5, 7))];
      } catch {
        this.log.error('failed to convert hex string to number');
        return result;
      }

      return result;
    }

    private getCurrentColor(universeNumber: number, startChannel: number, colorOrder: string) {
      const firstChannel: number = this.sacnUniverseMap[universeNumber].sacnSlotsData[startChannel-1];
      const secondChannel: number = this.sacnUniverseMap[universeNumber].sacnSlotsData[startChannel];
      const thirdChannel: number = this.sacnUniverseMap[universeNumber].sacnSlotsData[startChannel+1];
      let red = firstChannel;
      let blue = secondChannel;
      let green = thirdChannel;

      switch (colorOrder.toLowerCase().substring(0, 1)) {
        case 'r':
          red = firstChannel;
          break;
        case 'g':
          green = firstChannel;
          break;
        case 'b':
          blue = firstChannel;
          break;
      }

      switch (colorOrder.toLowerCase().substring(1, 2)) {
        case 'r':
          red = secondChannel;
          break;
        case 'g':
          green = secondChannel;
          break;
        case 'b':
          blue = secondChannel;
          break;
      }

      switch (colorOrder.toLowerCase().substring(2, 3)) {
        case 'r':
          red = thirdChannel;
          break;
        case 'g':
          green = thirdChannel;
          break;
        case 'b':
          blue = thirdChannel;
          break;
      }


      return [red, green, blue];
    }

    private rgbToColorString(r: number, g: number, b: number) {
      let colorString = '#';
      colorString += this.intToHexStr(r);
      colorString += this.intToHexStr(g);
      colorString += this.intToHexStr(b);
      return colorString;
    }

    private intToHexStr(input: number) {
      let result = input.toString(16);
      if (result.length === 1) {
        result += '0';
      }

      return result;
    }
}