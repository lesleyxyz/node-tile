import { BaseTransaction } from "./BaseTransaction.js";

export class PpmTransaction extends BaseTransaction {
    constructor(data: Buffer | number | null = null, int: number | null = null){
        if(Buffer.isBuffer(data)){
            if(int == null){
                super(data[0], data.subarray(1))                
            }else{
                super(3, data)
            }
        }else{
            super(2, Buffer.from([]))
        }
    }
}