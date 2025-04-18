import { Tile } from "../models/Tile.js";
import { Device, GattServer, GattService, GattCharacteristic } from 'node-ble'
import {
    AbstractTileService,
    BleGattMode,
    FEED_SERVICE,
    MEP_COMMAND_CHAR,
    MEP_RESPONSE_CHAR,
    TILE_ID_CHAR
} from './AbstractTileService.js'

export class TileServiceBle extends AbstractTileService {
    peripheral: Device
    gattServer: GattServer
    feedService: GattService
    mepCommandChar: GattCharacteristic
    mepResponseChar: GattCharacteristic
    tileIdChar: GattCharacteristic

    constructor(peripheral: Device){
        super()
        this.peripheral = peripheral
        this.bleGattMode = BleGattMode.DISCONNECTED
    }

    async connect(rssiTimeout = 2000){
        this.macAddress = await this.peripheral.getAddress()

        this.emit("debug", `[${this.macAddress}] Connecting`)
        await this.peripheral.connect()
        this.gattServer = await this.peripheral.gatt()

        setInterval(async _=> {
            try {
                this.emit("rssi", await this.peripheral.getRSSI())
            }catch{}
        }, rssiTimeout)

        return super.connect(rssiTimeout)
    }

    async discoverServices(){
        this.emit("debug", `[${this.macAddress}] Discovering services`)
        const services = await this.gattServer.services()
        this.emit("debug", `[${this.macAddress}] Service found: ${services.join(" ")}`)

        this.feedService = await this.gattServer.getPrimaryService(FEED_SERVICE)
        if(!this.feedService){
            throw "Feed service not found"
        }

        this.emit("debug", `[${this.macAddress}] [FEED_SERVICE] Discovering characteristics`)
        const characteristics = await this.feedService.characteristics()
        this.emit("debug", `[${this.macAddress}] [FEED_SERVICE] Characteristics found: ${characteristics.join(" ")}`)
        
        this.mepCommandChar = await this.feedService.getCharacteristic(MEP_COMMAND_CHAR)
        this.mepResponseChar = await this.feedService.getCharacteristic(MEP_RESPONSE_CHAR)
        try{
            this.tileIdChar = await this.feedService.getCharacteristic(TILE_ID_CHAR)
        }catch (e){
            this.tileIdChar = null
            this.emit("debug", `[${this.macAddress}] [FEED_SERVICE] Tile ID characteristic not found, Tile does not use Private ID`)
        }

        if(!this.isMepCmdOrRespSet()){
            throw "BLE Characteristics not found :( is this a Tile?"
        }

        await this.mepResponseChar.on('valuechanged', this.onMepResponse.bind(this))
    }

    async authenticate(tile: Tile){
        this.emit("debug", `[${this.macAddress}] [FEED_SERVICE] Subscribing to MEP Response`)
        await this.mepResponseChar.startNotifications()
        this.emit("debug", `[${this.macAddress}] Subscribed to MEP Response`)
        await super.authenticate(tile)
    }

    isMepCmdOrRespSet(): boolean {
        return !!(this.mepCommandChar || this.mepResponseChar)
    }

    async _sendPackets(toSend: Buffer){
        await this.mepCommandChar.writeValue(toSend, {
            type: "command"
        })
    }

    async _disconnect(): Promise<void> {
        await this.peripheral.disconnect()
    }
}
