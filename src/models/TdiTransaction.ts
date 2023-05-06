import { BaseTransaction } from "./BaseTransaction.js";
import { ByteUtils } from "../utils/ByteUtils.js";
import { TileDataInformation } from "./TileDataInformation.js";

export class TdiTransaction extends BaseTransaction {
    constructor(data){
        if(Buffer.isBuffer(data)){
            super(data[0], data.subarray(1))
        }else{
            super(data, Buffer.from([]))
        }
    }

    isInfoAvailable(info: TileDataInformation){
        return ByteUtils.isBitOfByteSet(info.bitIndex, this.data[0])
    }
}