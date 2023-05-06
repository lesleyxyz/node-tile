import { BaseTransaction } from "./BaseTransaction.js";

export class TfcTransaction extends BaseTransaction {
    constructor(data: Buffer | null | number = null){
        if(Buffer.isBuffer(data)){
            super(data[0], data.subarray(1))
        }else if(data == null){
            super(1, Buffer.from([1]))
        }else{
            super(3, Buffer.from([]))
        }
    }
}