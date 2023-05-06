import { BaseTransaction } from "./BaseTransaction.js";

export class AuthTransaction extends BaseTransaction {
    constructor(data){
        if(Buffer.isBuffer(data)){
            super(data[0], data.subarray(1))
        }else{
            throw "Data is not a buffer"
        }
    }
}