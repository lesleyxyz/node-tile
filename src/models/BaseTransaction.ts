export class BaseTransaction {
    prefix
    data: Buffer

    constructor(prefix, data: Buffer){
        this.prefix = prefix
        this.data = data
    }

    public getPrefix(){
        return this.prefix
    }

    public getFullPacket(){
        return Buffer.from([this.prefix, ...this.data]);
    }

    public getError(){
        let errMap = {
            1: "ERROR_UNSUPPORTED",
            2: "ERROR_PARAMETERS",
            3: "ERROR_SECURITY",
            4: "ERROR_INVALID_STATE",
            5: "ERROR_MEM_READ",
            6: "ERROR_MEM_WRITE",
            7: "ERROR_DATA_LENGTH",
            8: "ERROR_INVALID_SIZE",
            9: "ERROR_SIGNATURE",
            10: "ERROR_CRC",
            11: "ERROR_CRC2",
            12: "ERROR_HASH",
            13: "ERROR_PRODUCT_HEADER",
            14: "ERROR_IMAGE_HEADER",
            15: "ERROR_SAME_IMAGE",
            16: "ERROR_INVALID_DATA",
            17: "ERROR_MEM_ERASE",
            18: "ERROR_RESOURCE_IN_USE",
            19: "ERROR_FW_VERSION"
        }

        return errMap[this.data[1]] || "ERROR_ERROR_NOT_FOUND"
    }
}