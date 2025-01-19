import { BaseTransaction } from "./BaseTransaction.js";

export class ChannelTransaction extends BaseTransaction {
    constructor(data){
        if(Buffer.isBuffer(data)){
            super(data[0], data.subarray(1))
        }else{
            throw "Data is not a buffer"
        }
    }

    getErrorType(){
        let b = this.prefix

        let prefixToStrMap = {
            0: "CLOSE_REASON_NO_ERROR",
            1: "CLOSE_REASON_MIC_FAILURE",
            2: "CLOSE_REASON_TKA_MISSING",
            3: "CLOSE_REASON_BROADCAST_MIC_FAIL",
        }

        return prefixToStrMap[b] || "RESPONSE_NOT_FOUND"
    }
}