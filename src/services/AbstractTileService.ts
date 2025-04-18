import { TkaTransaction, TdgTransaction, TfcTransaction, ToaTransaction, TdtTransaction, SongTransaction, TcuTransaction, ToaMepProcessor, ChannelTransaction, AuthTransaction, TdiTransaction, ToaProcessor, ChOpenTransaction, ToaFeature, BaseTransaction } from "../models/index.js";
import { TrmTransaction, ReadyTransaction, TileDataInformation, toaToResp, txFactory, TimeTransaction, RingingStateMachine, RingingStateType, AdvIntTransaction, PpmTransaction, TdtConfig } from "../models/index.js";
import { HighDuty, LowDuty } from "../models/TcuParams.js";
import { TileVolume } from "../models/TileVolume.js";
import { Tile } from "../models/Tile.js";
import { CryptoUtils } from '../utils/CryptoUtils.js'
import EventEmitter from "events";
import {ByteUtils} from "../utils/index.js";

const sleep = ms => new Promise(r => setTimeout(r, ms))

export const BleGattMode = {
    DISCOVERED: 0,
    CONNECTING: 1,
    CONNECTED: 2,
    CONNECTED_AND_SERVICES_DISCOVERED: 3,
    CONNECTED_AND_IS_USER_TILE: 4,
    CONNECTED_AND_FAILED_SERVICE_DISCOVERY: 5,
    CONNECTED_BUT_DROPPED: 6,
    DISCONNECTING: 7,
    DISCONNECTING_IN_ERROR: 8,
    DISCONNECTED: 9
}

// BLE Service to activate a new Tile
export const FEEC_SERVICE: string = "0000feec-0000-1000-8000-00805f9b34fb"
// BLE Service to communicate with a Tile
export const FEED_SERVICE: string = "0000feed-0000-1000-8000-00805f9b34fb"
// BLE Characteristic to send commands to a Tile
export const MEP_COMMAND_CHAR: string = "9d410018-35d6-f4dd-ba60-e7bd8dc491c0"
// BLE Characteristic to receive responses from a Tile
export const MEP_RESPONSE_CHAR: string = "9d410019-35d6-f4dd-ba60-e7bd8dc491c0"
// This Tile ID characteristic is not always present. It lives in the "deviceInfoService"
// It is only present in newer tiles that have a PrivateId
// The service UUID of deviceInfoService could be "180a" but at this time I have not seen it
// Possibly because I have an older version of the til
export const TILE_ID_CHAR: string = "9d410007-35d6-f4dd-ba60-e7bd8dc491c0"

export class AbstractTileService extends EventEmitter {
    // Tile Info
    tile: Tile
    tileId: string
    tileIdAsBytes: Buffer
    model: string
    firmware: string
    hardware: string

    // Auth Params
    randA: Buffer
    randT: Buffer
    sresT: Buffer

    macAddress: string
    advertisingInterval: number = 0
    bleGattMode: number = BleGattMode.DISCONNECTED
    toaMepProcessor: ToaMepProcessor
    toaProcessor: ToaProcessor
    initialTdiTransaction: TdiTransaction
    isNotifyAuthTripletSeen: boolean = false
    diagData: Buffer
    ringingStateMachine: RingingStateMachine
    packetListeners = {}
    onAuthenticatedListener = _ => {}

    constructor(){
        super()
    }

    async connect(rssiTimeout = 2000){
        this.initialTdiTransaction = null
        this.diagData = Buffer.from([])
        this.toaProcessor = new ToaProcessor()
        this.ringingStateMachine = new RingingStateMachine()

        this.emit("debug", `[${this.macAddress}] Connected`)
        await this.discoverServices()
        this.emit("debug", `Discovered services ${this.macAddress}`)

        this.randA = CryptoUtils.generateRandomBytes(14)
        this.toaMepProcessor = new ToaMepProcessor(CryptoUtils.generateRandomBytes(4))

        this.bleGattMode = BleGattMode.CONNECTED_AND_SERVICES_DISCOVERED
    }

    async discoverServices(){
        throw Error("Not implemented")
    }

    isTile(){
        throw Error("Not implemented")
    }

    isTileActivated(){
        throw Error("Not implemented")
    }

    async getTileId() {
        throw Error("Not implemented");
    }

    authenticate(tile: Tile){
        this.tile = tile;

        if(!this.isMepCmdOrRespSet()){
            throw "BLE Characteristics not found :( is this a Tile?"
        }

        this.startTdiSequence()

        return new Promise(r => {
            this.onAuthenticatedListener = r;
        });
    }

    getAuthKeyHmac(){
        let decodedAuthKey = Buffer.from(this.tile.getAuthKey(), 'base64');
        if(this.isMepCmdOrRespSet()){
            return CryptoUtils.generateHmac(decodedAuthKey, this.randA, this.toaMepProcessor.channelData, this.toaMepProcessor.channelPrefix, this.toaMepProcessor.data).subarray(0, 16)
        }
        throw "TODO Unsupported Operation: generateAdvancedHmac"
    }

    isMepCmdOrRespSet(): boolean {
        throw Error("Not implemented")
    }

    onMepResponse(data: Buffer) {
        let responseType = this.toaMepProcessor.getResponseType(data)
        if(responseType == "NOT_VALID"){
            // Destined for another channel
            this.emit("debug", `Error Invalid Response ${data.toString('hex')}`)
            return
        }

        let toaTx = this.toaMepProcessor.createTransaction(data)
        let cleanBytes = this.toaProcessor.cleanToaBytes(responseType, toaTx.data)
        let toaType = toaTx.getToaType()
        let toaData = toaTx.data
        this.emit("debug", `char RX ${toaType} ${data.toString('hex')}`)

        let tx;
        try{
            tx = txFactory(toaTx.prefix, cleanBytes);
        }catch(err){
            this.emit("debug", `Error txFactory ${err}`)
        }

        if(toaTx.prefix in this.packetListeners){
            this.packetListeners[toaTx.prefix](tx)
            delete this.packetListeners[toaTx.prefix]
            return
        }

        if(responseType == "CONNECTIONLESS_ID_RESPONSE") {
            if(toaType == "TOA_RSP_AUTHENTICATE" || toaType == "TOA_RSP_ASSOCIATE"){
                if(toaType == "TOA_RSP_AUTHENTICATE") {
                    this.sendPacketsPreAuth(16, this.randA)
                }
                return this.handleAuthAssociateTransaction(new AuthTransaction(toaData))
            } else if (toaType == "TOA_RSP_OPEN_CHANNEL") {
                return this.handleChannelOpenTransaction(new ChOpenTransaction(toaData))
            }

            this.emit("debug", `Unhandled connectionless TOA type ${toaType} ${responseType}`)
            return
        }

        if (toaType == "TOA_RSP_READY") {
            return this.handleNonceReady(cleanBytes)
        } else if (toaType == "TOA_RSP_TKA") {
            return this.handleTkaTransaction(tx as TkaTransaction)
        } else if (toaType == "TOA_RSP_CLOSE_CHANNEL") {
            return this.handleCloseChannelTransaction(tx as ChannelTransaction)
        } else if (toaType == "TOA_RSP_TDT"){
            return this.handleTdtTranscation(tx as TdtTransaction)
        } else if (toaType == "TOA_RSP_TDG"){
            return this.handleTdgTransaction(tx as TdgTransaction)
        } else if (toaType == "TOA_RSP_TRM"){
            return this.handleTrmTransaction(tx as TdgTransaction)
        }

        this.emit("debug", `Unhandled TOA type ${toaType} ${responseType}`)
    }

    async programNewSong(song: Uint8Array) {
        let bf = Buffer.alloc(3)
        let offset = 0;
        offset = bf.writeInt8(1, offset)
        offset = bf.writeInt16LE(song.length, offset)

        let response = await this.sendPacketsAsync(5, new SongTransaction(4, bf))
        if(response.getResponseType() !== "TOA_SONG_RSP_PROGRAM_READY"){
            throw Error("Tile was not ready for programming")
        }

        let maxPayloadSize = this.toaProcessor.maxPayloadSize - 1;
        let bytesPerBlock = response.data.readUInt8()
        let numBlocksToWrite = Math.ceil(song.length / bytesPerBlock);
        let fwIndex = 0;

        for(let blockWriting = 0; fwIndex < song.length && blockWriting < numBlocksToWrite; blockWriting++){
            let numBytesForThisBlock = Math.min(song.length - fwIndex, bytesPerBlock);
            let startPos = blockWriting * bytesPerBlock;
            let toWriteThisBlock = song.slice(startPos, startPos + numBytesForThisBlock);

            let checksum = this.getChecksum(toWriteThisBlock);
            let toWriteWithChecksum = new Uint8Array(numBytesForThisBlock + 2);
            toWriteWithChecksum.set(toWriteThisBlock);
            toWriteWithChecksum[numBytesForThisBlock] = (checksum & 255);
            toWriteWithChecksum[numBytesForThisBlock + 1] = ((checksum >> 8) & 255);

            let maxPacketLength = Math.min(toWriteWithChecksum.length, maxPayloadSize)
            for(let packetsWritten = 0; packetsWritten < toWriteWithChecksum.length; packetsWritten += maxPacketLength){
                maxPacketLength = Math.min(toWriteWithChecksum.length - packetsWritten, maxPayloadSize)

                let newSongBytes = toWriteWithChecksum.slice(packetsWritten, packetsWritten + maxPacketLength);
                if(packetsWritten + maxPacketLength < toWriteThisBlock.length){
                    this.sendPacketsAsync(5, new SongTransaction(5, Buffer.from(newSongBytes)));
                }else{
                    let resp = await this.sendPacketsAsync(5, new SongTransaction(5, Buffer.from(newSongBytes))) as SongTransaction

                    if (resp.getResponseType() == "TOA_SONG_RSP_ERROR"){
                        throw "Program error " + resp.getError()
                    }
                }
                await sleep(100)
            }
            fwIndex += numBytesForThisBlock
        }
    }
      
    getChecksum(bytes: Uint8Array) {
        let checksum = 0;
      
        for (let b of bytes) {
            b = (b ^ checksum) & 255;
            let b2 = 0;
        
            for (let i = 0; i < 8; i++) {
                b2 = ((b2 ^ b) & 1) ? (b2 >> 1) ^ 33800 : b2 >> 1;
                b = b >> 1;
            }
        
            checksum = (checksum >> 8) ^ b2;
        }
    
        return checksum;
    }

    handleAdvIntTransaction(tx: AdvIntTransaction) {
        // ADV_INT_RSP_READ_VAL_OK
        if(tx.prefix == 2) {
            let advInt = tx.data
            if(advInt.length != 2){
                this.emit("debug", `Error AdvInt length ${advInt.length} unsupported`)
                return
            }
            this.advertisingInterval = advInt.readInt16LE()
            return
        }

        // ADV_INT_RSP_WRITE_VAL_OK
        if(tx.prefix == 3) {
            if(!this.isToaFeatureSupported(ToaFeature.TDG)){
                this.notifyAuthTripletSeen()
                return
            }
            return
        }

        if(tx.prefix == 16 || tx.prefix == 17){
            this.emit("debug", `Error AdvInt ${tx.getError()} ${tx.getResponseType()}`)
        }
    }

    async handleTdgTransaction(tx: TdgTransaction) {
        if(tx.prefix == 32) {
            this.emit("debug", `Error TdgError ${tx.getError()} ${tx.getResponseType()}`)
            return
        }

        if(tx.prefix == 1 || tx.prefix == 2){
            if(this.diagData == null){
                this.diagData = Buffer.from([])
            }

            this.diagData = Buffer.concat([this.diagData, tx.data])
        }

        if(tx.prefix == 1){
            if(this.isToaFeatureSupported(ToaFeature.PPM)){
                this.sendPackets(6, new PpmTransaction().getFullPacket())
            }
            if(this.isToaFeatureSupported(ToaFeature.ADV_INT)){
                let advInt = await this.sendPacketsAsync(7, new AdvIntTransaction())
                this.handleAdvIntTransaction(advInt)
            }
            if(this.isToaFeatureSupported(ToaFeature.TCU)){
                if(!this.shouldTofu()){
                    this.sendTcuRequest();
                }else if(!this.isNotifyAuthTripletSeen){
                    this.notifyAuthTripletSeen()
                }
                return
            }
            throw "Unsupported diag end sequence"
        }
    }

    isToaFeatureSupported(feature: ToaFeature) {
        return this.isMepCmdOrRespSet() && this.toaProcessor.isToaFeatureSupported(feature)
    }

    shouldTofu() {
        if(!this.isToaFeatureSupported(ToaFeature.TOFU)){
            return false;
        }

        if(this.ringingStateMachine.ringingState == RingingStateType.PENDING_PLAY){
            return true;
        }else if(this.ringingStateMachine.ringingState == RingingStateType.AWAIT_PLAY_RESPONSE){
            return true;
        }else if(this.ringingStateMachine.ringingState == RingingStateType.PLAY_ISSUED){
            return true;
        }

        return false;
    }

    async sendTcuRequest(){
        if(!this.isToaFeatureSupported(ToaFeature.TCU)) return

        // TODO: check tcuParamsList and pick the one with the lowest max conn interval
        let tcuParams = new LowDuty("TCU_REQUEST_TAG_DEFAULT");
        let resp = await this.sendPacketsAsync(12, new TcuTransaction(tcuParams))
        this.handleTcuTransaction(resp)
    }

    handleTdtTranscation(tx: TdtTransaction) {
        // double tab from tile received
        if(tx.prefix === 2){
            if(tx.data[0] == 0x00){
                this.emit("singleTab")
            }else if(tx.data[0] == 0x02){
                this.emit("doubleTab")
            }
        }
    }

    handleTcuTransaction(tx: TcuTransaction) {
        if(tx.prefix == 3) {
            if(!this.isNotifyAuthTripletSeen){
                this.notifyAuthTripletSeen()
            }
        }else if(tx.prefix == 32){
            this.emit("debug", `TcuError ${tx.getError()}`)
            if(!this.isNotifyAuthTripletSeen){
                this.notifyAuthTripletSeen()
            }
        }
    }

    async notifyAuthTripletSeen(){
        if(this.isToaFeatureSupported(ToaFeature.TDT) && !this.tile.isFirmwareExpired()){
            let expectedTdtConfig = this.tile.getExpectedTdtCmdConfig()
            let tdtConfig = new TdtConfig(expectedTdtConfig)
            let tx = new TdtTransaction(tdtConfig.toFullPacket(), true);
            this.sendPackets(4, tx.getFullPacket())
        }

        if(this.isToaFeatureSupported(ToaFeature.TIME)) {
            let curTime = Math.round(Number(new Date().getTime() / 1000)) - 1451606400;
            let buffer = CryptoUtils.convertToLongBuffer(curTime);
            this.sendPackets(13, new TimeTransaction(buffer, 0).getFullPacket())
        }

        if(this.isToaFeatureSupported(ToaFeature.TPFS)){
            // Song map
            await this.sendPacketsAsync(5, new SongTransaction(6)) as SongTransaction
        }

        if(this.isToaFeatureSupported(ToaFeature.TRM)){
            // Tile RSSI Monitoring
            await this.stopTileRssiMonitoring()
            await sleep(2000)
            await this.startTileRssiMonitoring()
        }

        this.isNotifyAuthTripletSeen = true;
        await this.sendTcuRequest()
        this.onAuthenticatedListener("OK")
    }

    async startTileRssiMonitoring(batchSize: number = 5) {
        // The greater the batch size, the longer it'll take between RSSI readings
        // The batch size also amounts to how many readings it will send you

        let tx = await this.sendPacketsAsync(24, new TrmTransaction(Buffer.from([0x01, batchSize]))) as TrmTransaction
        let rType = tx.getResponseType()
        if(rType === "TRM_RSP_START_NOTIFY"){
            this.emit("debug", "Started Tile RSSI Monitoring")
        }else{
            this.emit("debug", `Tile RSSI Monitoring not started: ${tx.getResponseType()}`)
        }
    }

    async stopTileRssiMonitoring(){
        return await this.sendPackets(24, new TrmTransaction(2).getFullPacket())
    }

    handleTrmTransaction(tx: TrmTransaction){
        let responseType = tx.getResponseType();

        if(responseType === "TRM_RSP_START_NOTIFY"){
            this.emit("debug", "Tile confirmed it started monitoring RSSI")
        }else if(responseType === "TRM_RSP_STOP_NOTIFY"){
            this.emit("debug", "Tile confirmed it stopped monitoring RSSI")
        }else if(responseType === "TRM_RSP_READ"){
            this.emit("debug", "Tile requested RSSI read")
        }else if(responseType === "TRM_RSP_NOTIFY"){
            this.emit("debug", "Received RSSI from tile")
            let length = tx.data[0]
            let rssiBatches = tx.data.subarray(1, length+1)
            let denormalizedBatches = Array.from(rssiBatches).map(f => Math.pow(10, f / 10))
            let avg = denormalizedBatches.reduce((a, b) => a + b) / denormalizedBatches.length
            let normalizedAvg = Math.log10(avg) * 10
            let scaled = -100 + ((normalizedAvg / 0xff) * 100)

            this.emit("debug", `Got TRM RSSI batches: ${rssiBatches.toString('hex')}`)
            this.emit("tileRssi", scaled)
        }else if(responseType === "TRM_RSP_ERROR"){
            this.emit("debug", `TRM Error: ${tx.getError()}`)
        }else{
            this.emit("debug", `Error TRM response type not found ${tx.prefix}`)
        }
    }

    async programBionicBirdieSong(){
        await this.programNewSong(Uint8Array.from([
            0x01, 0x01, 0x00, 0x00, 0x18, 0x01, 0x38, 0xEF, 0x1A, 0xF5, 0xFE, 0x3B, 0x48,
            0xB5, 0x2C, 0x9A, 0x53, 0xA3, 0x35, 0xAE, 0xFD, 0xB4, 0x7E, 0x59, 0xB2, 0x57,
            0x3A, 0xDE, 0x75, 0xDE, 0x09, 0x51, 0x43, 0x9F, 0x27, 0x3A, 0x18, 0x27, 0xDB,
            0x9B, 0xA2, 0xCF, 0x42, 0x4B, 0x67, 0x72, 0x11, 0xCE, 0xC4, 0xE8, 0xC9, 0xBF,
            0x33, 0xA7, 0x65, 0xFE, 0xE2, 0xDC, 0x16, 0xDA, 0x48, 0x44, 0x82, 0x59, 0xE4,
            0x54, 0xC4, 0x91, 0x7E, 0x4B, 0x70, 0x54, 0x45, 0x81, 0x77, 0x34, 0xF6, 0x68,
            0xBC, 0x6A, 0x66, 0xDF, 0x46, 0x04, 0xD4, 0x7B, 0x5E, 0x6D, 0xE4, 0x54, 0xFB,
            0x2D, 0x13, 0x9D, 0x4B, 0x5C, 0x77, 0xD9, 0x98, 0xF0, 0xA7, 0x63, 0x3F, 0x03,
            0x43, 0x03, 0x3F, 0x03, 0x43, 0x03, 0x3F, 0x03, 0x43, 0x03, 0x3F, 0x03, 0x43,
            0x03, 0x3F, 0x03, 0x43, 0x06, 0x00, 0x03, 0x4B, 0x0D, 0x43, 0x0D,
            0x44, 0x0D, 0x46, 0x0D, 0x4B, 0x09, 0x00, 0x04, 0x46, 0x06, 0x00, 0x06, 0x52,
            0x06, 0x00, 0x06, 0x46, 0x06, 0x00, 0x13, 0x4F, 0x03, 0x52, 0x03, 0x4F, 0x03,
            0x52, 0x03, 0x4F, 0x03, 0x52, 0x03, 0x00, 0x06, 0x4B, 0x03, 0x4F, 0x03, 0x4B,
            0x03, 0x4F, 0x03, 0x4B, 0x03, 0x4F, 0x03, 0x00, 0x06, 0x44, 0x03, 0x48, 0x03,
            0x44, 0x03, 0x48, 0x03, 0x44, 0x03, 0x48, 0x03, 0x44, 0x03, 0x48, 0x03, 0x44,
            0x03, 0x48, 0x06, 0x00, 0x03, 0x50, 0x0D, 0x48, 0x0D, 0x49, 0x0D, 0x4B, 0x0D,
            0x50, 0x09, 0x00, 0x04, 0x4B, 0x06, 0x00, 0x06, 0x57, 0x06, 0x00, 0x06, 0x4B,
            0x06, 0x00, 0x13, 0x54, 0x03, 0x57, 0x03, 0x54, 0x03, 0x57, 0x03, 0x54, 0x03,
            0x57, 0x03, 0x54, 0x03, 0x57, 0x06, 0x00, 0x16, 0x46, 0x03, 0x4A, 0x03, 0x46,
            0x03, 0x4A, 0x03, 0x46, 0x03, 0x4A, 0x03, 0x46, 0x03, 0x4A, 0x03,
            0x46, 0x03, 0x4A, 0x06, 0x00, 0x03, 0x52, 0x0D, 0x4A, 0x0D, 0x4B, 0x0D, 0x4D,	
            0x0D, 0x52, 0x09, 0x00, 0x04, 0x4D, 0x06, 0x00, 0x06, 0x59, 0x06, 0x00, 0x06,	
            0x4D, 0x06, 0x00, 0x13, 0x56, 0x03, 0x59, 0x03, 0x56, 0x03, 0x59, 0x03, 0x56,	
            0x03, 0x59, 0x03, 0x00, 0x06, 0x52, 0x03, 0x56, 0x03, 0x52, 0x03, 0x56, 0x03,	
            0x52, 0x03, 0x56, 0x03, 0x00, 0x06, 0x4B, 0x03, 0x4F, 0x03, 0x4B, 0x03, 0x4F,	
            0x03, 0x4B, 0x03, 0x4F, 0x03, 0x4B, 0x03, 0x4F, 0x03, 0x4B, 0x03, 0x4F, 0x06,	
            0x00, 0x03, 0x57, 0x0D, 0x4F, 0x0D, 0x50, 0x0D, 0x52, 0x0D, 0x57, 0x09, 0x00,	
            0x04, 0x52, 0x06, 0x00, 0x06, 0x5E, 0x06, 0x00, 0x06, 0x52, 0x06, 0x00, 0x13,	
            0x5B, 0x03, 0x5E, 0x03, 0x5B, 0x03, 0x5E, 0x03, 0x5B, 0x03, 0x5E, 0x03, 0x5B,	
            0x03, 0x5E, 0x06, 0x00, 0x0B, 0x00, 0x00, 0x00, 0x00
        ]))
    }

    async sendRinger(volume: TileVolume = TileVolume.HIGH, seconds: number = 30) {
        let bf = volume.volumeBytes

        if(this.isToaFeatureSupported(ToaFeature.TSD)){
            // Tile Song Duration
            bf = Buffer.concat([bf, Buffer.from([seconds])])
        }

        return (await this.sendPacketsAsync(5, new SongTransaction(2, bf))) as SongTransaction
    }

    handleTkaTransaction(tx: TkaTransaction) {
        let tkaType = tx.getResponseType()
        if(tkaType == "TKA_RSP_CONFIG" || tx.prefix == "TKA_RSP_READ_CONFIG"){
            return
        }

        if(tkaType == "TKA_RSP_CHECK") {
            // heartbeat
            this.sendPackets(8, new TkaTransaction().getFullPacket());
            return
        }

        this.emit("debug", `Error TKA ${tkaType}`)
    }

    async handleCloseChannelTransaction(tx: ChannelTransaction) {
        this.emit("debug", `Error: Closing channel ${tx.getPrefix()} ${tx.getErrorType()} ${tx.data.toString('hex')}`)

        if(tx.getErrorType() === "CLOSE_REASON_MIC_FAILURE" || tx.getErrorType() === "CLOSE_REASON_BROADCAST_MIC_FAIL"){
            let got = tx.data.subarray(0, 4)
            let expected = tx.data.subarray(4, 8)
            let gotString = tx.getErrorType() === "CLOSE_REASON_MIC_FAILURE" ? "Nonce" : "Client NonceB"

            this.emit("debug", `Got ${gotString} ${got.toString('hex')} expected MIC ${expected.toString('hex')}`)
        }

        this.toaProcessor.channelOpened = false
        this._disconnect()
    }

    async _disconnect(){
        throw Error("Not implemented")
    }

    setToaProcessorReady(){
        this.toaProcessor.tileId = this.tileId;
        this.toaProcessor.macAddress = this.macAddress;
        this.toaProcessor.firmware = this.firmware;
        this.toaProcessor.model = this.model;
        this.toaProcessor.authKeyHmac = this.getAuthKeyHmac();
        this.toaProcessor.securityLevel = this.getSecurityLevel();
        this.toaProcessor.mepChannelAuthKeyHmac = this.getMepChannelAuthKeyHmac();
        this.toaProcessor.gotNoncePacket = true;
    }

    handleNonceReady(toaData: Buffer){
        if(!this.toaProcessor.gotNoncePacket){
            this.setToaProcessorReady()
        }

        this.toaProcessor.maxPayloadSize = toaData[0]
        let length = toaData.length - 1
        let nonceData = toaData.subarray(1, length+1)
        if(length >= 7){
            let nonceInfo = nonceData.subarray(0, 3)
            this.toaProcessor.nonceB = nonceData.subarray(3, 7).readUint32LE()

            if(length > 7){
                nonceInfo = Buffer.concat([nonceInfo, nonceData.subarray(7)])
            }

            this.toaProcessor.featuresAvailable = nonceInfo
        }else{
            this.toaProcessor.featuresAvailable = nonceData.subarray(0, length)
        }
        this.toaProcessor.nonceT++;

        if(this.isToaFeatureSupported(ToaFeature.TFC)){
            this.sendPackets(15, new TfcTransaction().getFullPacket())
        }else if(this.isToaFeatureSupported(ToaFeature.TDG)){
            this.sendPacketsAsync(10, new TdgTransaction())
        }else{
            throw "Neither TFC or TDG is supported"
        }
    }

    handleChannelOpenTransaction(tx: ChOpenTransaction){
        this.toaMepProcessor.channelPrefix = tx.prefix
        this.toaMepProcessor.channelData = tx.data
        this.toaMepProcessor.channelOpened = true

        this.setToaProcessorReady()
        this.toaProcessor.channelOpened = false

        this.sendPackets(18, Buffer.from([19]))
    }

    getMepChannelAuthKeyHmac(){
        if(this.isMepCmdOrRespSet) return null

        let decodedAuthKey = Buffer.from(this.tile.getAuthKey(), 'base64');
        let channelData =  this.toaMepProcessor.channelData.subarray(0, 10)
        return CryptoUtils.generateHmac(decodedAuthKey, channelData, this.tileIdAsBytes)
    }

    getSecurityLevel(){
        // TODO
        return 1
    }

    handleAuthAssociateTransaction(tx: AuthTransaction){
        this.randT = tx.data.subarray(0, 10)
        this.sresT = tx.data.subarray(10, 14)
    }

    async startTdiSequence(){
        this.emit("debug", `Starting Tile Data Information sequence`)

        let tx = await this.sendPacketPreAuthAsync(19, new TdiTransaction(1)) as TdiTransaction
        if(tx.prefix == 32){
            throw `TDI Error ${tx.getError()}`
        }

        if(tx.isInfoAvailable(TileDataInformation.TILE_ID)){
            let tdiPacket = TileDataInformation.TILE_ID.createRequestPacket()
            let tx = await this.sendPacketPreAuthAsync(19, tdiPacket) as TdiTransaction
            this.tileId = tx.data.toString("hex")
            this.tileIdAsBytes = tx.data
        }

        if(tx.isInfoAvailable(TileDataInformation.FIRMWARE)){
            let tdiPacket = TileDataInformation.FIRMWARE.createRequestPacket()
            let tx = await this.sendPacketPreAuthAsync(19, tdiPacket) as TdiTransaction
            this.firmware = tx.data.toString("utf-8")
        }

        if(tx.isInfoAvailable(TileDataInformation.MODEL)){
            let tdiPacket = TileDataInformation.MODEL.createRequestPacket()
            let tx = await this.sendPacketPreAuthAsync(19, tdiPacket) as TdiTransaction
            this.model = tx.data.toString("utf-8")
        }

        if(tx.isInfoAvailable(TileDataInformation.HARDWARE)){
            let tdiPacket = TileDataInformation.HARDWARE.createRequestPacket()
            let tx = await this.sendPacketPreAuthAsync(19, tdiPacket) as TdiTransaction
            this.hardware = tx.data.toString("utf-8")
        }

        this.emit("debug", `All info is available! ${this.tileId} ${this.firmware} ${this.model} ${this.hardware}`)
        this.sendRandA()
    }

    sendRandA(){
        let length = this.isMepCmdOrRespSet() ? 14 : 16
        this.randA = CryptoUtils.generateRandomBytes(length)
        this.sendPacketsPreAuth(20, this.randA)
    }

    async sendPacketsAsync<T extends BaseTransaction>(toaPrefix: number, toaTx: T): Promise<T> {
        return new Promise(r => {
            this.packetListeners[toaToResp(toaTx)] = r
            this.sendPackets(toaPrefix, toaTx.getFullPacket());
        })
    }

    async sendPacketPreAuthAsync<T extends BaseTransaction>(toaPrefix: number, toaTx: T): Promise<T> {
        return new Promise(r => {
            this.packetListeners[toaToResp(toaTx)] = r
            this.sendPacketsPreAuth(toaPrefix, toaTx.getFullPacket());
        })
    }

    async sendPackets(toaPrefix, toaData: Buffer){
        let payload = Buffer.from([toaPrefix, ...toaData]);
        let debugPayload = payload.toString('hex')
        
        this.toaProcessor.nonceA++;
        if(this.toaProcessor.isServerSupported()){
            let bfNonceA = CryptoUtils.convertToLongBuffer(this.toaProcessor.nonceA)
            let hmac = CryptoUtils.generateHmac(this.toaProcessor.authKeyHmac, bfNonceA, 1, payload.length, payload).subarray(0, 4)
            payload = Buffer.from([...payload, ...hmac])
            debugPayload = `${debugPayload} hmac=${hmac.toString('hex')}`
        }else{
            debugPayload = `${debugPayload} hmac=<no mac>`
        }

        let tx = new ToaTransaction(payload)
        if(this.isMepCmdOrRespSet()){
            let channelPrefix = this.toaMepProcessor.channelPrefix
            let bf = Buffer.from([channelPrefix, ...payload])
            tx = new ToaTransaction(bf)
            debugPayload = `CID=${channelPrefix} ${debugPayload}`
        }else{
            debugPayload = `CID=<no CID> ${debugPayload}`
        }

        let toSend = tx.getFullPacket()
        this.emit("debug", `char TX ${debugPayload} raw=${toSend.toString('hex')}`)
        await this._sendPackets(toSend)
    }

    async sendPacketsPreAuth(toaPrefix, toaData: Buffer){
        if(!ToaMepProcessor.magicPrefixBytes.includes(toaPrefix)){
            throw "Invalid toaPrefix for sendPacketsPreAuth";
        }

        let toSend = Buffer.from([0, ...this.toaMepProcessor.data, toaPrefix, ...toaData])
        this.emit("debug", `TX preAuth ${toSend.toString("hex")}`)
        await this._sendPackets(toSend)
    }

    async _sendPackets(toSend: Buffer){
        throw Error("Not implemented")
    }
}
