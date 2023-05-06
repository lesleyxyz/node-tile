import { ToaTransaction } from "./ToaTransaction.js"

export class ToaMepProcessor {
    static magicPrefixBytes = [16, 19, 20, 21]
    data: Buffer
    channelPrefix = -1
    channelData: Buffer
    channelOpened = false

    constructor(data: Buffer) {
        this.data = data
    }

    createTransaction(data: Buffer): ToaTransaction {
        // remove this.data
        if(data.length == 0){
            return new ToaTransaction(data)
        }

        let isConnectionLessResponse = data[0] == 0;
        let copyFrom = isConnectionLessResponse ? 5 : 1
        
        return new ToaTransaction(data.subarray(copyFrom))
    }

    getResponseType(data: Buffer){
        if(data.length === 0){
            return "NOT_VALID"
        }

        let prefix = data[0];

        if(prefix == 0 && data.length < 5){
            return "NOT_VALID"
        }else if(prefix === 1) {
            return "BROADCAST_RESPONSE"
        }
        
        if(prefix === 0) {
            let firstFourBytes = data.subarray(1, 5);
            if(firstFourBytes.compare(Buffer.from([0xFF, 0xFF, 0xFF, 0xFF])) == 0){
                return "CONNECTIONLESS_ID_RESPONSE"
            }
            if(firstFourBytes.compare(this.data) == 0){
                return "CONNECTIONLESS_ID_RESPONSE"
            }
        }

        if(prefix === this.channelPrefix && prefix !== -1) {
            return "CID_RESPONSE"
        }

        return "NOT_VALID"
    }
}

// CB,3E,80,2D,86,D0,6D,6B,73,3D,B5,A2,F7,6E,98,76
function tf(input){
    let str = input.toLowerCase().replaceAll(",", "")
    return Buffer.from(str, "hex")
}