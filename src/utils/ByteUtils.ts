export class ByteUtils {
    static isBitOfByteSet(bitIndex: number, byte){
        return (byte & (1 << bitIndex)) === 0 ? false : true;
    }
}