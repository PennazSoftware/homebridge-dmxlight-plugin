import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { DMXLightHomebridgePlatform } from './platform';
import { DmxController } from './dmx';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class DMXLightPlatformAccessory {
  private service: Service;
  private dmxController: DmxController;
  private driverName: string;
  private startChannel: number;
  private universeNumber: number;
  private channelCount: number;
  private colorOrder: string;
  private transitionEffect: string;
  private transitionDuration: number;
  private ipAddress: string;
  private serialPortName: string;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private accessoryState = {
    On: false,
    Brightness: 100,  // Values are 0-100
    Hue: 0,           // Values are 0-360
    Saturation: 0,    // Values are 0-100
  };

  constructor(
    private readonly platform: DMXLightHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    startChannel: number,
    universeNumber: number,
    channelCount: number,
    driverName: string,
    colorOrder: string,
    transitionEffect: string,
    transitionDuration: number,
    ipAddress: string,
    serialPortName: string,
  ) {

    this.startChannel = startChannel;
    this.universeNumber = universeNumber;
    this.channelCount = channelCount;
    this.driverName = driverName;
    this.colorOrder = colorOrder;
    this.transitionEffect = transitionEffect;
    this.transitionDuration = transitionDuration;
    this.ipAddress = ipAddress;
    this.serialPortName = serialPortName;

    // Create the DMX Controller object and initialize it
    this.dmxController = DmxController.getInstance(serialPortName, ipAddress,
      universeNumber, driverName, this.platform.log);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))                // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this));               // GET - bind to the `getOn` method below

    //register handlers for the Brightness, Hue & Saturation Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .onSet(this.setBrightness.bind(this))       // SET - bind to the 'setBrightness` method below
      .onGet(this.getBrightness.bind(this));      // GET - bind to the `getBrightness` method below

    this.service.getCharacteristic(this.platform.Characteristic.Hue)
      .onSet(this.setHue.bind(this))              // SET - bind to the 'setHue` method below
      .onGet(this.getHue.bind(this));             // GET - bind to the `getHue` method below

    this.service.getCharacteristic(this.platform.Characteristic.Saturation)
      .onSet(this.setSaturation.bind(this))       // SET - bind to the 'setSaturation` method below
      .onGet(this.getSaturation.bind(this));      // GET - bind to the `getSaturation` method below
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.accessoryState.On = value as boolean;

    if (this.accessoryState.On) {
      this.dmxController.setOn(this.driverName, this.universeNumber, this.startChannel, this.channelCount, this.colorOrder,
        this.accessoryState.Hue, this.accessoryState.Saturation, this.accessoryState.Brightness, this.transitionEffect,
        this.transitionDuration);
    } else {
      this.dmxController.setOff(this.driverName, this.universeNumber, this.startChannel, this.channelCount, this.colorOrder,
        this.transitionEffect, this.transitionDuration);
    }

    //this.platform.log.info('Set Characteristic On ->', value);
  }


  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async getOn(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const isOn = this.accessoryState.On;

    //this.platform.log.info('Get Characteristic On ->', isOn);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return isOn;
  }

  async getBrightness(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const brightness = this.accessoryState.Brightness;

    //this.platform.log.info('Get Characteristic Brightness ->', brightness);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return brightness;
  }

  async getHue(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const hue = this.accessoryState.Hue;

    //this.platform.log.info('Get Characteristic Hue ->', hue);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return hue;
  }

  async getSaturation(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const saturation = this.accessoryState.Saturation;

    //this.platform.log.info('Get Characteristic Saturation ->', saturation);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return saturation;
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */
  async setBrightness(value: CharacteristicValue) {
    // implement your own code to set the brightness
    this.accessoryState.Brightness = value as number;
    //this.platform.log.info('Set Characteristic Brightness -> ', value);

    this.dmxController.setHSB(this.driverName, this.universeNumber, this.startChannel, this.channelCount, this.colorOrder,
      this.accessoryState.Hue, this.accessoryState.Saturation, this.accessoryState.Brightness);
  }

  async setHue(value: CharacteristicValue) {
    // implement your own code to set the brightness
    this.accessoryState.Hue = value as number;

    //this.platform.log.info('Set Characteristic Hue -> ', value);

    this.dmxController.setHSB(this.driverName, this.universeNumber, this.startChannel, this.channelCount, this.colorOrder,
      this.accessoryState.Hue, this.accessoryState.Saturation, this.accessoryState.Brightness);
  }

  async setSaturation(value: CharacteristicValue) {
    // implement your own code to set the brightness
    this.accessoryState.Saturation = value as number;

    //this.platform.log.info('Set Characteristic Saturation -> ', value);

    this.dmxController.setHSB(this.driverName, this.universeNumber, this.startChannel, this.channelCount, this.colorOrder,
      this.accessoryState.Hue, this.accessoryState.Saturation, this.accessoryState.Brightness);
  }

  getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
  }
}
