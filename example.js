import noble from '@abandonware/noble'
import {TileService, TileVolume, UserService} from 'node-tile'

// We have to log into Tile to get the authkeys of your tile
let userService = new UserService("<your-tile-email>", "<your-tile-password>")
await userService.login()

let tiles = await userService.getTiles()
console.log(tiles)

noble.on('stateChange', state => {
	if (state === 'poweredOn'){
		noble.startScanning([], false);
	}else{
		console.log(`Couldn't start scanning, ${state}`)
		noble.stopScanning();
	}
});

noble.on('discover', async peripheral => {
	let address = peripheral.address.split(":").join("")
	
	// If we find ANY tile in our account, we continue
	let tile = tiles.filter(t => t.id.startsWith(address))[0]
	if(!tile){
		console.log("Non-tile", address)
		return
	}

	console.log("TILE", peripheral.address, peripheral.rssi, tile)
	noble.stopScanning()

	// Create the service based on bluetooth device & tile from our account
	let service = new TileService(peripheral, tile)

	service.on("singleTab", _ => console.log("Got single tab!"))
	service.on("doubleTab", _ => console.log("Got double tab!"))
	service.on("rssi", rssi => console.log("rssi", rssi))
	service.on("debug", msg => console.log("debug", msg))

	await service.connect()
	await service.sendRinger(TileVolume.MED)
});

process.on('SIGINT', _ => {
    noble.stopScanning();
    process.exit();
})