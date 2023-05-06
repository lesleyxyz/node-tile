import { TdiTransaction } from "./TdiTransaction.js";

export class TileDataInformation {
    static TILE_ID = new this(0, 2);
    static FIRMWARE = new this(1, 3);
    static MODEL = new this(2, 4);
    static HARDWARE = new this(3, 5);

    bitIndex: number
    requestPrefix: number

    constructor(bitIndex, requestPrefix){
        this.bitIndex = bitIndex,
        this.requestPrefix = requestPrefix
    }

    createRequestPacket(): TdiTransaction{
        return new TdiTransaction(this.requestPrefix)
    }
}