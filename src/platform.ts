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
    this.log.debug('Finished initializing platform:', this.config.name);

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

      let colorOrder = device.colorOrder;
      if (colorOrder === '') {
        colorOrder = 'rgb';
      }
      colorOrder = colorOrder.toLowerCase;

      if (colorOrder.length !== 3) {
        this.log.info('An unsupported color order was found. Now using default of "rgb".');
        colorOrder = 'rgb';
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
        new DMXLightPlatformAccessory(this, existingAccessory, device.dmxStartChannel, device.dmxUniverse,
          device.dmxChannelCount, device.driverName, colorOrder);

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
        new DMXLightPlatformAccessory(this, accessory, device.dmxStartChannel, device.dmxUniverse,
          device.dmxChannelCount, device.driverName, colorOrder);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }

  // Get the config properties
  getConfigProperties() {
    const properties = {
      name: this.config.name?.trim(),
      ipAddress: this.config.ipAddress.trim(),
      serialPortName: this.config.serialPortName.trim(),
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