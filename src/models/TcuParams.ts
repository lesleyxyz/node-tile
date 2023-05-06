export class TcuParams {
    str: string
    minConnInterval: number
    maxConnInterval: number
    slaveLatency: number
    connSuppTimeout = 600

    constructor(str, minConnInterval, maxConnInterval, slaveLatency){
        this.str = str
        this.minConnInterval = minConnInterval
        this.maxConnInterval = maxConnInterval
        this.slaveLatency = slaveLatency
    }

    toFullPacket(): Buffer {
        let b = Buffer.alloc(8)
        let offset = 0;

        let toWrite = [
            this.minConnInterval,
            this.maxConnInterval,
            this.slaveLatency,
            this.connSuppTimeout
        ]

        for(let int of toWrite){
            offset = b.writeInt16LE(int, offset)
        }

        return b
    }
}

export class GattRssi extends TcuParams {
    constructor(str, minConnInterval, maxConnInterval){
        super(str, minConnInterval, maxConnInterval, 0)
    }
}

export class HighDuty extends TcuParams {
    constructor(){
        super("TCU_REQUEST_TAG_TOFU", 10, 30, 0)
    }
}

export class LowDuty extends TcuParams {
    constructor(str){
        super(str, 288, 304, 4)
    }
}

export class TrmRssi extends TcuParams {
    constructor(str){
        super(str, 150, 170, 0)
    }
}