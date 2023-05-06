export class Tile {
    id: string
    authKey: string
    name: string
    productCode: string
    expectedTdtCmdConfig: string

    constructor(id, authKey, name, productCode, expectedTdtCmdConfig){
        this.id = id
        this.authKey = authKey
        this.name = name
        this.productCode = productCode
        this.expectedTdtCmdConfig = expectedTdtCmdConfig
    }

    getAuthKey(){
        return this.authKey
    }

    isFirmwareExpired(){
        return false;
    }

    getExpectedTdtCmdConfig(){
        return this.expectedTdtCmdConfig
    }
}