import {BaseTransaction} from "./BaseTransaction.js";
import {TcuParams} from "./TcuParams.js";

export class TcuTransaction extends BaseTransaction {
    constructor(dataOrTcuParams: TcuParams | Buffer = null){
        if(Buffer.isBuffer(dataOrTcuParams)){
            super(dataOrTcuParams[0], dataOrTcuParams.subarray(1))
        }else{
            super(3, (dataOrTcuParams as TcuParams).toFullPacket())
        }
    }
}