import { BaseTransaction } from "./BaseTransaction.js";

export class TrmTransaction extends BaseTransaction {
    constructor(data){
        if(Buffer.isBuffer(data)){
            super(data[0], data.subarray(1))
        }else{
            super(data, Buffer.from([]))
        }
    }

    getResponseType(){
        let errMap = {
            1: "TRM_RSP_START_NOTIFY",
            2: "TRM_RSP_STOP_NOTIFY",
            3: "TRM_RSP_READ",
            4: "TRM_RSP_NOTIFY",
            32: "TRM_RSP_ERROR"
        }

        return errMap[this.prefix] || "RESPONSE_NOT_FOUND"
    }
}