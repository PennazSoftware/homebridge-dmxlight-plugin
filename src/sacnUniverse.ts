import { Client, IPacket } from 'e131';
import { Logger } from 'homebridge';

export class SacnUniverse {
    sacnSlotsData: Array<number>;
    sacnPacket: IPacket;

    constructor(sacnClient: Client, universe: number, log: Logger) {
      // Create packets to support a full universe of 512
      this.sacnPacket = sacnClient.createPacket(512);
      this.sacnPacket.setSourceName('DMXLightPlugin');
      this.sacnPacket.setUniverse(universe);
      this.sacnSlotsData = this.sacnPacket.getSlotsData();

      log.info('Initialized new SACN Universe #' + universe);
    }
}