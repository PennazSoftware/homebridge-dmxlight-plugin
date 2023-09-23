import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { DMXLightPlatformAccessory } from './platformAccessory';

/**
 * DMXLightHomebridgePlatform
 * This class is the main constructor for the DMX Light plugin
 */
export class DMXLightHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.info('Finished initializing platform:', this.config.name);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * Register accessories as defined within the accessories section of the platform
   */
  discoverDevices() {

    const properties = this.getConfigProperties();

    // loop over the discovered devices and register each one if it has not already been registered
    for (const device of properties.accessories) {

      let colorOrder = device.colorOrder + '';
      if (colorOrder === '' || colorOrder === null) {
        colorOrder = 'rgb';
      }
      colorOrder = colorOrder.toLocaleLowerCase();

      if (colorOrder.length !== 3) {
        if (colorOrder === 'w') {
          this.log.info('Single-channel fixture found.');
        } else {
        this.log.info('An unsupported color order was found. Now using default of "rgb".');
        colorOrder = 'rgb';
      }

      let ipAddress = '';
      if (device.ipAddress !== undefined && device.ipAddress !== null) {
        ipAddress = device.ipAddress;
      }

      let serialPortName = '';
      if (device.serialPortName !== undefined && device.serialPortName !== null) {
        serialPortName = device.serialPortName;
      }

      let dmxStartChannel = 0;
      if (device.dmxStartChannel !== undefined && device.dmxStartChannel !== null) {
        dmxStartChannel = device.dmxStartChannel;
      }

      let dmxUniverse = 0;
      if (device.dmxUniverse !== undefined && device.dmxUniverse !== null) {
        dmxUniverse = device.dmxUniverse;
      }

      let dmxChannelCount = 0;
      if (device.dmxChannelCount !== undefined && device.dmxChannelCount !== null) {
        dmxChannelCount = device.dmxChannelCount;
      }

      let driverName = '';
      if (device.driverName !== undefined && device.driverName !== null) {
        driverName = device.driverName.toString().toLocaleLowerCase();
      } else {
        this.log.error('The driverName field is missing from the accessory config JSON');
      }

      let transitionDuration = 0;
      if (device.transitionDuration !== undefined && device.transitionDuration !== null) {
        transitionDuration = device.transitionDuration;
      }

      // verify that if a transition effect was specified that the duration is > 0
      let transitionEffect = '';
      if (device.transitionEffect !== undefined && device.transitionEffect !== null) {
        transitionEffect = device.transitionEffect.toString().toLocaleLowerCase();
      }

      switch (transitionEffect) {
        case 'gradient':
        case 'chase':
        case 'random':
          if (transitionDuration === 0) {
            this.log.warn('The ' + transitionEffect + ' was specified, however, the transition duration is 0.');
          }

          if (driverName === 'enttec-usb-dmx-pro') {
            this.log.warn('Transition effects are not compatible with enttec-usb-dmx-pro devices.');
          }
          break;
        default:
          if (transitionEffect !== 'none' && transitionEffect !== '') {
            this.log.warn('An invalid transition effect was specified: ' + transitionEffect);
          }
      }

      // verify that if the device is sacn-based that an ip address was specified
      if (driverName === 'sacn') {
        if (ipAddress === '') {
          this.log.error('The IP Address for each SACN accessory must be specified in the accessory config.');
          this.log.error('NOTE: The IP Address was previously a global value but is now associated with each accessory.');
        }
      }

      // verify that if the device is enttec-usb-dmx-pro-based that a serial port was specified
      if (driverName === 'enttec-usb-dmx-pro') {
        if (serialPortName === '') {
          this.log.error('The IP Address for each SACN accessory must be specified in the accessory config.');
          this.log.error('NOTE: The IP Address was previously a global value but is now associated with each accessory.');
        }
      }

      // generate a unique id for the accessory
      const uuid = this.api.hap.uuid.generate(device.id);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        // the accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        new DMXLightPlatformAccessory(this, existingAccessory, dmxStartChannel, dmxUniverse,
          dmxChannelCount, driverName, colorOrder, transitionEffect, transitionDuration,
          ipAddress, serialPortName);

      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.info('Adding new accessory:', device.name);

        // create a new accessory
        const accessory = new this.api.platformAccessory(device.name, uuid);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = device;

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        new DMXLightPlatformAccessory(this, accessory, dmxStartChannel, dmxUniverse,
          dmxChannelCount, driverName, colorOrder, transitionEffect, transitionDuration,
          ipAddress, serialPortName);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }

  // Get the config properties
  getConfigProperties() {

    const properties = {
      name: this.config.name?.toString().trim(),
      accessories: this.config.accessories,
    };

    if (!this.isIterable(properties.accessories)) {
      properties.accessories = [];
    }

    return properties;
  }

  isIterable(value: unknown) {
    return Symbol.iterator in Object(value);
  }
}
