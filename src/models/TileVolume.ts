export class TileVolume {
    static AUTO = new this(Buffer.from([22, 3, 3]))
    static HIGH = new this(Buffer.from([1, 3]))
    static MED = new this(Buffer.from([1, 2]))
    static LOW = new this(Buffer.from([1, 1]))

    volumeBytes: Buffer
    constructor(volumeBytes: Buffer){
        this.volumeBytes = volumeBytes
    }
}