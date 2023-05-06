import {BaseTransaction} from "./BaseTransaction.js";

export class TdtConfig {
    data: Buffer

    constructor(configStr) {
        let decoded = Buffer.from(configStr, 'base64');

        if(decoded.length < 4){
            throw "TdtConfig payload size must be atleast 4"
        }

        this.data = decoded
    }

    toFullPacket(){
        return this.data
    }
}

export class TdtTransaction extends BaseTransaction {
    constructor(data: Buffer, prefix1: boolean = false){
        if(prefix1){
            super(1, data)
        }else{
            super(data[0], data.subarray(1))
        }
    }

    getErrorType(){
        let errMap = {
            16: "ERROR_UNSUPORTED",
            17: "ERROR_PARAMETERS",
        }

        return errMap[this.prefix] || "ERROR_NOT_FOUND"
    }
}