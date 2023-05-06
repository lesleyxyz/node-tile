import {BaseTransaction} from "./BaseTransaction.js";
import {TcuParams} from "./TcuParams.js";

export class SongTransaction extends BaseTransaction {
    constructor(prefixOrBuffer: number | Buffer, payload: Buffer = Buffer.from([])){
        if(Buffer.isBuffer(prefixOrBuffer)){
            super(prefixOrBuffer[0], prefixOrBuffer.subarray(1))
        }else{
            super(prefixOrBuffer, payload)
        }
    }

    getResponseType(){
        let respMap = {
            1: "TOA_SONG_RSP_READ_FEATURES_OK",
            2: "TOA_SONG_RSP_PLAY_OK",
            3: "TOA_SONG_RSP_STOP_OK",
            4: "TOA_SONG_RSP_PROGRAM_READY",
            5: "TOA_SONG_RSP_BLOCK_OK",
            6: "TOA_SONG_RSP_PROGRAM_COMPLETE",
            7: "TOA_SONG_RSP_SONG_MAP",
            32: "TOA_SONG_RSP_ERROR",
        }

        return respMap[this.prefix] || "TOA_SONG_RSP_ERROR"
    }
}