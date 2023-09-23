import { DMX, EnttecUSBDMXProDriver } from 'dmx-ts';
import { Logger } from 'homebridge';
import { SacnUniverse } from './sacnUniverse';
import shuffle from 'shuffle-array';

export class DmxController {
    private dmx: DMX;
    private log: Logger;
    private dmxUniverseName = 'dmxLightUniverse';
    private updateInterval = 100;
    private sacnUniverse: SacnUniverse;
    private driverName = '';
    private colorOrder = 'rgb';
    private singleChannel = 0;

    // Constructor
    constructor(serialPort: string, ipAddress: string, universe: number, driverName: string,
      channelStart: number, channelCount: number, colorOrder: string, transitionEffect: string,
      transitionEffectDuration: number, log: Logger) {
      this.log = log;
      this.dmx = new DMX();
      this.driverName = driverName;
      this.colorOrder = colorOrder;

      if (serialPort !== '') {
        // Configure Enttec Pro
        this.dmx.addUniverse(this.dmxUniverseName, new EnttecUSBDMXProDriver(serialPort))
          .then(() => {
            this.log.info('successfully added universe for Enttec Pro');
          })
          .catch((err) => {
            this.log.error('error adding universe for Enttec Pro: ' + err);
          } );

        // Create a dummy sacnUniverse to fulfill class requirement
        this.sacnUniverse = new SacnUniverse('', 0, 0, 0, '', '', 0, log);
        return;
      }

      // Initialize SACN Universe if necessary
      this.sacnUniverse = new SacnUniverse(ipAddress, universe, channelStart, channelCount, colorOrder,
        transitionEffect, transitionEffectDuration, log);

    }

    setOn(hue: number, saturation: number, brightness: number) {

      const rgb = this.HSVtoRGB(hue/360, saturation/100, brightness/100);

    // Handle single-channel operations
    if (this.sacnUniverse.colorOrder === 'w') {
        singleChannel = 1;
    } else {
        singleChannel = 0;
    }
    // Internally we will treat single-channel as standard rgb, using the first value for all three, 
    // so transitions will work for single-channel sACN fixtures.
    // (The setSacnColor function only sends the first value for single-channel fixtures.)
        
        this.log.info('DMX On with Color: HSV=' + hue + '/' + saturation + '%/' + brightness + '%, RGB=' + rgb.r + '/' +
        rgb.g + '/' + rgb.b + ' (Universe #' + this.sacnUniverse.universe + ', Channels #' + this.sacnUniverse.channelStart + '-' +
          (this.sacnUniverse.channelStart + this.sacnUniverse.channelCount - 1) + ', transition=' + this.sacnUniverse.transitionEffect +
          ', duration=' + this.sacnUniverse.transitionEffectDuration + ')');

      // Remap colors if necessary
      const colors = this.mapColors(rgb.r, rgb.g, rgb.b, this.sacnUniverse.colorOrder);

      // If colors are all off then we need to change them to all on
      if (colors[0] + colors[1] + colors[2] === 0) {
        colors[0] = 255;
        colors[1] = 255;
        colors[2] = 255;
      }

      switch (this.driverName) {
        case 'enttec-usb-dmx-pro':
          this.log.info('setting channels ' + this.sacnUniverse.channelStart + '-' + (this.sacnUniverse.channelStart+2) + ' on');

          if (this.sacnUniverse.colorOrder === 'w') {
            // eslint-disable-next-line no-case-declarations
            const channel = { [this.sacnUniverse.channelStart]: 255 };
            this.dmx.update(this.dmxUniverseName, channel);
            return;
          }

          // eslint-disable-next-line no-case-declarations
          const channel = { [this.sacnUniverse.channelStart]: colors[0], [this.sacnUniverse.channelStart+1]: colors[1],
            [this.sacnUniverse.channelStart+2]: colors[2] };
          this.dmx.update(this.dmxUniverseName, channel);
          break;

        case 'sacn':
          switch (this.sacnUniverse.transitionEffect) {
            case 'gradient':
              this.applyFadeInTransition(colors[0], colors[1], colors[2]);
              break;
            case 'random':
              this.applyRandomTransition(colors[0], colors[1], colors[2]);
              break;
            case 'chase':
              this.applyChaseTransition(colors[0], colors[1], colors[2]);
              break;
            default:
                 this.setSacnColor(colors[0], colors[1], colors[2]);
          }
          break;
      }
    }

    setOff() {
      this.log.info('DMX Off (Universe #' + this.sacnUniverse.universe + ', Channels #' + this.sacnUniverse.channelStart + '-' +
      (this.sacnUniverse.channelStart + this.sacnUniverse.channelCount - 1) + ')');

      switch (this.driverName) {
        case 'enttec-usb-dmx-pro':
          if (this.sacnUniverse.colorOrder === 'w') {
            // eslint-disable-next-line no-case-declarations
            const channel = { [this.sacnUniverse.channelStart]: 0 };
            this.dmx.update(this.dmxUniverseName, channel);
            return;
          }

          // eslint-disable-next-line no-case-declarations
          const channel = { [this.sacnUniverse.channelStart]: 0, [this.sacnUniverse.channelStart+1]: 0,
            [this.sacnUniverse.channelStart+2]: 0 };
          this.dmx.update(this.dmxUniverseName, channel);
          break;
              
        case 'sacn':
          switch (this.sacnUniverse.transitionEffect) {
            case 'gradient':
              this.applyFadeOutTransition(0, 0, 0);
              break;
            case 'random':
              this.applyRandomTransition(0, 0, 0);
              break;
            case 'chase':
              this.applyChaseTransition(0, 0, 0);
              break;
            default:
                this.setSacnColor(0, 0, 0);
          }
          break;
      }
    }

    setHSB(hue: number, saturation: number, brightness: number) {

      const rgb = this.HSVtoRGB(hue/360, saturation/100, brightness/100);

      if (this.colorOrder !== 'w') {
        this.log.info('Set Color: HSV=' + hue + '/' + saturation + '%/' +
        brightness + '%, RGB=' + rgb.r + '/' + rgb.g + '/' + rgb.b + ' (Universe #' + this.sacnUniverse.universe +
        ', Channels #' + this.sacnUniverse.channelStart + '-' + (this.sacnUniverse.channelStart +
          this.sacnUniverse.channelCount - 1) + ')');
      } else {
        this.log.info('Set Brightness to ' + (255 * brightness));
      }

      // Remap colors if necessary
      const colors = this.mapColors(rgb.r, rgb.g, rgb.b, this.sacnUniverse.colorOrder);

      switch (this.driverName) {
        case 'enttec-usb-dmx-pro':
          if (this.sacnUniverse.colorOrder === 'w') {
            // eslint-disable-next-line no-case-declarations
            const channel = { [this.sacnUniverse.channelStart]: 255 * brightness };
            this.dmx.update(this.dmxUniverseName, channel);
            return;
          }

          // eslint-disable-next-line no-case-declarations
          let channel = { [this.sacnUniverse.channelStart]: colors[0]};
          this.dmx.update(this.dmxUniverseName, channel);
          channel = { [this.sacnUniverse.channelStart+1]: colors[1]};
          this.dmx.update(this.dmxUniverseName, channel);
          channel = { [this.sacnUniverse.channelStart+2]: colors[2]};
          this.dmx.update(this.dmxUniverseName, channel);
          break;
              
        case 'sacn':
          this.setSacnColor(colors[0], colors[1], colors[2]);
          break;
      }
    }

    private setSacnColor(r: number, g: number, b: number) {
      const endChannel = this.sacnUniverse.channelStart-1 + this.sacnUniverse.channelCount-1;
      //this.log.info('Updating slots buffer from ' + (startChannel-1) + ' - ' + endChannel);
      //this.log.info('Color set to ' + r + '/' + g + '/' + b);

      let p = 1;
      for (let idx = this.sacnUniverse.channelStart-1; idx <= endChannel; idx++) {
        switch (p) {
          case 1:
            this.sacnUniverse.sacnSlotsData[idx] = r;
            break;

            // Only update all three values for 3-channel fixtures
            if (singleChannel === 0) {
              case 2:
                this.sacnUniverse.sacnSlotsData[idx] = g;
                break;
              case 3:
                this.sacnUniverse.sacnSlotsData[idx] = b;
                break;
            }
        }

        p++;
        if (p > 3) {
          p = 1;
        }
      }

      this.sacnUniverse.sacnClient.send(this.sacnUniverse.sacnPacket);
    }

    // applyFadeOutTransition creates a smooth transition from the current color to off
    private applyFadeOutTransition(r: number, g: number, b: number) {
      const ccRGB = this.getCurrentColor();
      const ccHSV = this.rgbToHsv(ccRGB[0], ccRGB[1], ccRGB[2]);

      // If its already at the target then bail
      if (b === ccHSV[2]) {
        return;
      }

      const fadeInterval = Math.round(this.sacnUniverse.transitionEffectDuration/this.updateInterval);

      let brightness = ccHSV[2];
      const brightnessDelta = Math.abs(brightness - b);
      const stepAmount = brightnessDelta / fadeInterval;
      const interval = fadeInterval;

      const timerId = setInterval(() => {
        brightness = brightness - stepAmount;

        if (brightness < 0) {
          brightness = 0;
        }

        const rgb = this.HSVtoRGB(ccHSV[0], ccHSV[1], brightness);
        //console.log('h=' + ccHSV[0] + ', s=' + ccHSV[1] + ', v: ' + brightness + ' | r=' + rgb.r + ', g=' + rgb.g + ', b=' + rgb.b);

        this.setSacnColor(rgb.r, rgb.g, rgb.b);

        if (brightness <= 0) {
          clearTimeout(timerId);
          return;
        }
      }, interval);
    }

    // applyFadeInTransition creates a smooth transition from off to the desired color
    private applyFadeInTransition(r: number, g: number, b: number) {
      const fadeInterval = Math.round(this.sacnUniverse.transitionEffectDuration/this.updateInterval);
      const destColor = this.rgbToHsv(r, g, b);
      let brightness = 0;
      const brightnessDelta = destColor[2];
      const stepAmount = brightnessDelta / fadeInterval;
      const interval = fadeInterval;

      const timerId = setInterval(() => {
        brightness = brightness + stepAmount;

        if (brightness > 1) {
          brightness = 1;
        }

        const rgb = this.HSVtoRGB(destColor[0], destColor[1], brightness);

        this.setSacnColor(rgb.r, rgb.g, rgb.b);

        if (brightness >= 1) {
          clearTimeout(timerId);
          return;
        }
      }, interval);
    }

    // applyRandomTransition transitions each light to the desired color one at a time in a random order
    private applyRandomTransition(r: number, g: number, b: number) {
      const switchOrder = this.createRandomColorSwitchOrder(this.sacnUniverse.channelCount);
      const timeInterval = Math.round(this.sacnUniverse.transitionEffectDuration/switchOrder.length);
      let index = 0;

      const timerId = setInterval(() => {
        this.setSacnColor(r, g, b);
        index += 1;

        if (index >= switchOrder.length) {
          clearTimeout(timerId);
          return;
        }
      }, timeInterval);
    }

    // applyChaseTransition transitions each light to the desired color one at a time from beginning to end
    private applyChaseTransition(r: number, g: number, b: number) {
      const timeInterval = Math.round(this.sacnUniverse.transitionEffectDuration/(this.sacnUniverse.channelCount/3));
      let channelIndex = 0;

      const timerId = setInterval(() => {
        this.setSacnColor(r, g, b);
        channelIndex += 3;

        if (channelIndex >= this.sacnUniverse.channelCount) {
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

    if (singleChannel === 0) {
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
    }
      return colors;
    }

    private getCurrentColor() {
      const firstChannel: number = this.sacnUniverse.sacnSlotsData[this.sacnUniverse.channelStart-1];
      const secondChannel: number = this.sacnUniverse.sacnSlotsData[this.sacnUniverse.channelStart];
      const thirdChannel: number = this.sacnUniverse.sacnSlotsData[this.sacnUniverse.channelStart+1];
      let red = firstChannel;

    // For single-channel fixtures, set all three colors to the same value to allow transitions to work properly
      if (singleChannel === 1) {
        let blue = firstChannel;
        let green = firstChannel;
          
      } else {
        let blue = secondChannel;
        let green = thirdChannel; 
          
      switch (this.sacnUniverse.colorOrder.toLowerCase().substring(0, 1)) {
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

      switch (this.sacnUniverse.colorOrder.toLowerCase().substring(1, 2)) {
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

      switch (this.sacnUniverse.colorOrder.toLowerCase().substring(2, 3)) {
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
      }
      return [red, green, blue];
    }

    private rgbToHsv(r: number, g: number, b: number) {
      r /= 255, g /= 255, b /= 255;

      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = max;
      let s = max;
      const v = max;

      const d = max - min;
      s = max === 0 ? 0 : d / max;

      if (max === min) {
        h = 0; // achromatic
      } else {
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }

        if (h !== undefined) {
          h /= 6;
        } else {
          h = 0;
        }
      }

      return [ h, s, v ];
    }
}
