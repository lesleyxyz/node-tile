import {BaseTransaction} from "./index.js";
import {ChannelTransaction} from "./ChannelTransaction.js";
import {TcuTransaction} from "./TcuTransaction.js";
import {ChOpenTransaction} from "./ChOpenTransaction.js";
import {TimeTransaction} from "./TimeTransaction.js";
import {SongTransaction} from "./SongTransaction.js";
import {PpmTransaction} from "./PpmTransaction.js";
import {TkaTransaction} from "./TkaTransaction.js";
import {AdvIntTransaction} from "./AdvIntTransaction.js";
import {TdgTransaction} from "./TdgTransaction.js";
import {TdtTransaction} from "./TdtTransaction.js";
import {TdiTransaction} from "./TdiTransaction.js";
import {ReadyTransaction} from "./ReadyTransaction.js";
import {TrmTransaction} from "./TrmTransaction.js";


interface txMapType {
    [k: number]: {
        name: string, 
        tx
    }
}

let txMap: txMapType = {
    0: {name: "TOA_RSP_RESERVED", tx: null},
    1: {name: "TOA_RSP_READY", tx: ReadyTransaction},
    2: {name: "TOA_RSP_TOFU_CTL", tx: null},
    3: {name: "TOA_RSP_ASSERT", tx: null},
    4: {name: "TOA_RSP_BDADDR", tx: null},
    5: {name: "TOA_RSP_ERROR", tx: null},
    6: {name: "TOA_RSP_TDT", tx: TdtTransaction},
    7: {name: "TOA_RSP_SONG", tx: SongTransaction},
    8: {name: "TOA_RSP_PPM", tx: PpmTransaction},
    9: {name: "TOA_RSP_ADV_INT", tx: AdvIntTransaction},
    10: {name: "TOA_RSP_TKA", tx: TkaTransaction},
    11: {name: "TOA_RSP_TAC", tx: null},
    12: {name: "TOA_RSP_TDG", tx: TdgTransaction},
    13: {name: "TOA_RSP_TMD", tx: null},
    14: {name: "TOA_RSP_TCU", tx: TcuTransaction},
    15: {name: "TOA_RSP_TIME", tx: TimeTransaction},
    16: {name: "TOA_RSP_TEST", tx: null},
    17: {name: "TOA_RSP_TFC", tx: null},
    18: {name: "TOA_RSP_OPEN_CHANNEL", tx: ChOpenTransaction},
    19: {name: "TOA_RSP_CLOSE_CHANNEL", tx: ChannelTransaction},
    20: {name: "TOA_RSP_TDI", tx: TdiTransaction},
    21: {name: "TOA_RSP_AUTHENTICATE", tx: null},
    25: {name: "TOA_RSP_TRM", tx: TrmTransaction},
    26: {name: "TOA_RSP_TPC", tx: null},
    27: {name: "TOA_RSP_ASSOCIATE", tx: null},
    28: {name: "TOA_RSP_AUTHORIZE", tx: null},
    29: {name: "TOA_RSP_TUC_DEPRECATED", tx: null},
    30: {name: "TOA_RSP_TUC", tx: null}
}

export function toaToResp<T extends BaseTransaction>(tx: T): number {
    for(let [toaPrefix, v] of Object.entries(txMap)){
        if(v.tx == null) continue
        if(tx instanceof v.tx){
            return parseInt(toaPrefix)
        }
    }
    throw "You can't await this type of transaction"
}

export function txFactory(prefix: number, data: Buffer): BaseTransaction {
    let mapEntry = txMap[prefix]
    if(!mapEntry.tx) {
        throw "No TX type: " + mapEntry.name
    }
    return new mapEntry.tx(data)
}

export class ToaTransaction extends BaseTransaction {
    constructor(data: Buffer){
        super(data[0], data.subarray(1))
    }

    public getToaType() {
        return txMap[this.prefix].name || "RESPONSE_NOT_FOUND"
    }
}