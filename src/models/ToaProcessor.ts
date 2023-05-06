import { ToaFeature } from "./ToaFeature.js"
import { ByteUtils } from "../utils/ByteUtils.js"

function isServerSupported(){
    return true
}

export class ToaProcessor {
    tileId: String
    macAddress: String
    firmware: String
    model: String
    authKeyHmac: Buffer
    securityLevel: Number
    mepChannelAuthKeyHmac: Buffer
    gotNoncePacket: boolean = false
    nonceA: number = 0
    nonceT: number = 0
    nonceB: number = 0
    maxPayloadSize
    featuresAvailable: Buffer
    channelOpened: boolean = false

    constructor() {}

    cleanToaBytes(responseType: string, data: Buffer): Buffer {
        let isConnectionlessIdResponse = responseType === "CONNECTIONLESS_ID_RESPONSE";
        let isBroadcastResponse = responseType === "BROADCAST_RESPONSE";

        let length;
        if ((isServerSupported() && !isConnectionlessIdResponse) || isBroadcastResponse) {
            length = data.length - 4;
        } else {
            length = data.length;
        }

        return data.subarray(0, length);
    }

    isToaFeatureSupported(feature: ToaFeature){
        if(!this.featuresAvailable) return false;

        let byte = feature.byteLocation;
        if(byte > 2) byte++

        if(byte > this.featuresAvailable.length) return false
        return ByteUtils.isBitOfByteSet(feature.bitLocation, this.featuresAvailable[byte])
    }

    isServerSupported(){
        let serverSupported = this.securityLevel == 1
        let isTmaSupported = this.isToaFeatureSupported(ToaFeature.TMA)
        if(serverSupported != isTmaSupported){
            console.error("ToaProcessor.isServerSupported mismatch", {serverSupported, isTmaSupported})
        }

        return serverSupported
    }
}