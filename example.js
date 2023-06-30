import {TileServiceBle, TileVolume, UserService} from 'node-tile'
import {createBluetooth} from 'node-ble'

const sleep = ms => new Promise(r => setTimeout(r, ms))
const {bluetooth, destroy} = createBluetooth()
const adapter = await bluetooth.defaultAdapter()

if(!await adapter.isDiscovering()){
	await adapter.startDiscovery()
}

// We have to log into Tile to get the authkeys of your tile
const userService = new UserService("<your-tile-email>", "<your-tile-password>")
await userService.login()

// If we find ANY tile in our account, we continue
const tiles = await userService.getTiles()
console.log("Tiles in your account", tiles)
console.log("Searching for tile...")

const [tileUuid, tile] = await getATile(tiles)
console.log("Tile found", tileUuid, tile.name)
await adapter.stopDiscovery()

const device = await adapter.waitDevice(tileUuid)
// Create the service based on bluetooth device & tile from our account
let service = new TileServiceBle(device, tile)

service.on("singleTab", _ => console.log("Got single tab!"))
service.on("doubleTab", _ => console.log("Got double tab!"))
service.on("rssi", rssi => console.log("rssi", rssi))
service.on("tileRssi", rssi => console.log("tileRssi", rssi))
service.on("debug", msg => console.log("debug", msg))

await service.connect()
await service.sendRinger(TileVolume.MED)

async function getATile(tiles){
	while(true){
		const bleUuids = await adapter.devices()
		for(let bleUuid of bleUuids){
			let bleUuidConverted = bleUuid.split(":").join("").toLowerCase()
			let tile = tiles.filter(t => t.id.startsWith(bleUuidConverted))[0]
			if(tile){
				return [bleUuid, tile]
			}
		}
		console.log("No tiles found in", bleUuids)
		await sleep(1000)
	}
}

process.on('SIGINT', async _ => {
    destroy()
    process.exit();
})

process.on("beforeExit", async (code) => {
	destroy()
})