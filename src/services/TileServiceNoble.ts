import { ToaMepProcessor } from "../models/index.js";
import { Tile } from "../models/Tile.js";
import { Peripheral, Service, Characteristic, Descriptor } from 'noble-winrt'
import { CryptoUtils } from '../utils/CryptoUtils.js'
import {
    AbstractTileService,
    BleGattMode,
    FEEC_SERVICE,
    FEED_SERVICE,
    MEP_COMMAND_CHAR,
    MEP_RESPONSE_CHAR,
    TILE_ID_CHAR
} from './AbstractTileService.js'

export class TileServiceNoble extends AbstractTileService {
    peripheral: Peripheral
    feedService: Service
    mepCommandChar: Characteristic
    mepResponseChar: Characteristic
    tileIdChar: Characteristic

    constructor(peripheral: Peripheral){
        super()
        this.macAddress = peripheral.address
        this.peripheral = peripheral
        this.bleGattMode = BleGattMode.DISCONNECTED
    }

    async connect(rssiTimeout = 2000){
        this.emit("debug", `[${this.macAddress}] Connecting`)
        await this.peripheral.connectAsync()
        
        setInterval(async _=> {
            this.emit("rssi", await this.peripheral.updateRssiAsync())
        }, rssiTimeout)

        this.peripheral.once('rssiUpdate', rssi => this.emit("rssi", rssi));

        return super.connect()
    }

    isTile() {
        let lowerServices = this.peripheral.advertisement.serviceUuids.map(s => s.toLowerCase())
        return lowerServices.includes(FEED_SERVICE.slice(4, 8)) || lowerServices.includes(FEEC_SERVICE.slice(4, 8))
    }

    isTileActivated() {
        let lowerServices = this.peripheral.advertisement.serviceUuids.map(s => s.toLowerCase())
        return lowerServices.includes(FEED_SERVICE.slice(4, 8)) && !lowerServices.includes(FEEC_SERVICE.slice(4, 8))
    }

    async getTileId() {
        // If the tileIdChar is not set, it does not use a Private ID, so return mac address
        if(!this.tileIdChar){
            return this.macAddress.replaceAll(":", "")
        }

        const tileId = await this.tileIdChar.readAsync()
        return tileId.toString('hex')
    }

    async discoverServices(){
        this.emit("debug", `[${this.macAddress}] Discovering services`)
        const services = await this.peripheral.discoverServicesAsync([]);
        this.emit("debug", `[${this.macAddress}] Service found: ${services.map(s => s.uuid).join(" ")}`)

        this.feedService = services.filter(s => s.uuid == FEED_SERVICE.slice(4, 8))[0]
        if(!this.feedService){
            throw "Feed service not found"
        }

        this.emit("debug", `[${this.macAddress}] [FEED_SERVICE] Discovering characteristics`)
        const characteristics = await this.feedService.discoverCharacteristicsAsync([]);
        this.emit("debug", `[${this.macAddress}] [FEED_SERVICE] Characteristics found: ${characteristics.map(c => c.uuid).join(" ")}`)

        this.mepCommandChar = characteristics.filter(c => c.uuid == MEP_COMMAND_CHAR.replaceAll("-", ""))[0]
        this.mepResponseChar = characteristics.filter(c => c.uuid == MEP_RESPONSE_CHAR.replaceAll("-", ""))[0]
        this.tileIdChar = characteristics.filter(c => c.uuid == TILE_ID_CHAR.replaceAll("-", ""))[0]
        if(!this.tileIdChar){
            this.emit("debug", `[${this.macAddress}] [FEED_SERVICE] Tile ID characteristic not found, Tile does not use Private ID`)
        }

        this.mepResponseChar.on('data', this.onMepResponse.bind(this))
    }

    async authenticate(tile: Tile){
        this.emit("debug", `[${this.macAddress}] [FEED_SERVICE] Subscribing to MEP Response`)
        await this.mepResponseChar.subscribeAsync()
        this.emit("debug", `[${this.macAddress}] Subscribed to MEP Response`)
        await super.authenticate(tile)
    }

    isMepCmdOrRespSet(): boolean {
        return !!(this.mepCommandChar || this.mepResponseChar)
    }

    async _sendPackets(toSend: Buffer){
        await this.mepCommandChar.writeAsync(toSend, true)
    }

    async _disconnect(): Promise<void> {
        await this.peripheral.disconnectAsync()
    }
}
