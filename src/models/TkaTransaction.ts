import { BaseTransaction } from "./BaseTransaction.js";

export class TkaTransaction extends BaseTransaction {
    constructor(data: Buffer | null = null){
        if(Buffer.isBuffer(data)){
            super(data[0], data.subarray(1))
        }else{
            super(3, Buffer.from([]))
        }
    }

    getResponseType(){
        let b = this.prefix

        let prefixToStrMap = {
            1: "TKA_RSP_CONFIG",
            2: "TKA_RSP_READ_CONFIG",
            3: "TKA_RSP_CHECK",
            16: "TKA_RSP_ERROR_UNSUPPORTED",
            17: "TKA_RSP_ERROR_PARAMS"
        }

        return prefixToStrMap[b] || "RESPONSE_NOT_FOUND"
    }
}