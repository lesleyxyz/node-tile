import {BaseTransaction} from "./BaseTransaction.js";

export class ReadyTransaction extends BaseTransaction {
    constructor(data: Buffer){
        super(data[0], data.subarray(1))
    }
}