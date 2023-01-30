declare module 'e131' {
    class Client {
      constructor(hostname: string, port?: number);
      public send(packet: IPacket, callback?: () => void): void;
      public createPacket(numSlots: number): IPacket;
    }

    interface IPacket {
        setSourceName(name: string): void;
        getUniverse(): number;
        setUniverse(universe: number): void;
        getSlotsData(): any;
    }
}