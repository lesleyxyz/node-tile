import { ToaMepProcessor } from "../models/index.js";
import { Tile } from "../models/Tile.js";
import { Device, GattServer, GattService, GattCharacteristic } from 'node-ble'
import { CryptoUtils } from '../utils/CryptoUtils.js'
import { AbstractTileService, BleGattMode, FEED_SERVICE, MEP_COMMAND_CHAR, MEP_RESPONSE_CHAR } from './AbstractTileService.js'

export class TileServiceBle extends AbstractTileService {
    peripheral: Device
    gattServer: GattServer
    feedService: GattService
    mepCommandChar: GattCharacteristic
    mepResponseChar: GattCharacteristic

    constructor(peripheral: Device, tile: Tile){
        super(tile)
        this.peripheral = peripheral
        this.bleGattMode = BleGattMode.DISCONNECTED
    }

    async connect(rssiTimeout = 2000){
        this.macAddress = await this.peripheral.getAddress()

        this.emit("debug", `Connecting ${this.macAddress}`)
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
        const services = await this.gattServer.services()
        this.emit("debug", `Services ${services.join(" ")}`)
        this.feedService = await this.gattServer.getPrimaryService(FEED_SERVICE)

        const characteristics = await this.feedService.characteristics()
        this.emit("debug", `Got service characteristics ${characteristics.join(" ")}`)
        
        this.mepCommandChar = await this.feedService.getCharacteristic(MEP_COMMAND_CHAR)
        this.mepResponseChar = await this.feedService.getCharacteristic(MEP_RESPONSE_CHAR)

        if(!this.isMepCmdOrRespSet()){
            throw "BLE Characteristics not found :( is this a Tile?"
        }

        this.randA = CryptoUtils.generateRandomBytes(14)
        this.toaMepProcessor = new ToaMepProcessor(CryptoUtils.generateRandomBytes(4))

        await this.mepResponseChar.on('valuechanged', this.onMepResponse.bind(this))
        await this.mepResponseChar.startNotifications()
        this.startTdiSequence()
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
