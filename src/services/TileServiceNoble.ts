import { ToaMepProcessor } from "../models/index.js";
import { Tile } from "../models/Tile.js";
import { Peripheral, Service, Characteristic, Descriptor } from 'noble-winrt'
import { CryptoUtils } from '../utils/CryptoUtils.js'
import { AbstractTileService, BleGattMode, FEED_SERVICE, MEP_COMMAND_CHAR, MEP_RESPONSE_CHAR } from './AbstractTileService.js'

export class TileServiceNoble extends AbstractTileService {
    peripheral: Peripheral
    feedService: Service
    mepCommandChar: Characteristic
    mepResponseChar: Characteristic

    constructor(peripheral: Peripheral, tile: Tile){
        super(tile)
        this.tile = tile
        this.macAddress = peripheral.address
        this.peripheral = peripheral
        this.bleGattMode = BleGattMode.DISCONNECTED
    }

    async connect(rssiTimeout = 2000){
        this.emit("debug", `Connecting ${this.macAddress}`)
        await this.peripheral.connectAsync()
        
        setInterval(async _=> {
            this.emit("rssi", await this.peripheral.updateRssiAsync())
        }, rssiTimeout)

        this.peripheral.once('rssiUpdate', rssi => this.emit("rssi", rssi));

        return super.connect()
    }

    async discoverServices(){
        this.emit("debug", `Discovering services for ${this.macAddress}`)
        const services = await this.peripheral.discoverServicesAsync([]);
        this.feedService = services.filter(s => s.uuid == FEED_SERVICE.slice(4, 8))[0]

        this.emit("debug", `Discovering characteristics for ${this.macAddress}`)
        const characteristics = await this.feedService.discoverCharacteristicsAsync([]);
        this.mepCommandChar = characteristics.filter(c => c.uuid == MEP_COMMAND_CHAR.replaceAll("-", ""))[0]
        this.mepResponseChar = characteristics.filter(c => c.uuid == MEP_RESPONSE_CHAR.replaceAll("-", ""))[0]

        if(!this.isMepCmdOrRespSet()){
            throw "BLE Characteristics not found :( is this a Tile?"
        }

        this.randA = CryptoUtils.generateRandomBytes(14)
        this.toaMepProcessor = new ToaMepProcessor(CryptoUtils.generateRandomBytes(4))

        this.emit("debug", `Discovering descriptors for ${this.macAddress}`)
        let descriptors = await this.mepResponseChar.discoverDescriptorsAsync()
        let descriptor = descriptors[0]

        this.emit("debug", `Subscribing to MEP Response for ${this.macAddress}`)
        descriptor.once('valueWrite', this.startTdiSequence.bind(this));
        this.mepResponseChar.on('data', this.onMepResponse.bind(this))
        this.mepResponseChar.subscribe(this.onCharSubscribed.bind(this));
        //await descriptor.writeValueAsync(Buffer.from([0x01, 0x00]))
    }

    onCharSubscribed(error){
        if (error) {
            console.error('Error subscribing to MEP Response');
            throw error
        }
        this.emit("debug", `Subscribed to MEP Response for ${this.macAddress}`)
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
