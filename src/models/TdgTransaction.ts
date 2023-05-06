import { BaseTransaction } from "./BaseTransaction.js";

export class TdgTransaction extends BaseTransaction {
    constructor(data: Buffer | null = null){
        if(Buffer.isBuffer(data)){
            super(data[0], data.subarray(1))
        }else{
            super(1, Buffer.from([]))
        }
    }

    getResponseType(){
        let respMap = {
            1: "TDG_RSP_DATA_END",
            2: "TDG_RSP_DATA_CONT",
            32: "TDG_RSP_ERROR",
        }

        return respMap 
    }
}