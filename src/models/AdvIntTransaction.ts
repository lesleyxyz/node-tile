import { BaseTransaction } from "./BaseTransaction.js";

export class AdvIntTransaction extends BaseTransaction {
    constructor(data: Buffer | number | null = null){
        if(Buffer.isBuffer(data)){
            super(data[0], data.subarray(1))                
        }else if(data == null){
            super(2, Buffer.from([]))
        }else{
            super(3, Buffer.from([data]))
        }
    }

    getResponseType(){
        let respMap = {
            1: "ADV_INT_RSP_READ_FEATURES_OK",
            2: "ADV_INT_RSP_READ_VAL_OK",
            3: "ADV_INT_RSP_WRITE_VAL_OK",
            16: "ADV_INT_RSP_ERROR_PARAMETERS",
            17: "ADV_INT_RSP_ERROR_UNSUPPORTED",
        }

        return respMap[this.prefix] || "RESPONSE_NOT_FOUND"
    }
}