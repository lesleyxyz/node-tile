import { BaseTransaction } from "./BaseTransaction.js";

export class TimeTransaction extends BaseTransaction {
    constructor(data: Buffer, i = null){
        if(i == null){
            super(data[0], data.subarray(1))
        }else{
            super(3, data)
        }
    }
}