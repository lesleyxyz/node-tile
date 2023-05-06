import noble from '@abandonware/noble'
import {TileService, TileVolume, UserService} from './src/index.js'

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
	
	let tile = tiles.filter(t => t.id.startsWith(address))[0]
	if(!tile){
		console.log("Non-tile", address)
		return
	}

	console.log("TILE", peripheral.address, peripheral.rssi, tile)
	noble.stopScanning()

	let service = new TileService(peripheral, tile)

	service.on("singleTab", _ => console.log("Got single tab!"))
	service.on("doubleTab", _ => console.log("Got double tab!"))
	service.on("rssi", rssi => console.log("rssi", rssi))
	service.on("debug", msg => console.log("debug", msg))

	await service.connect()
    await service.programBionicBirdieSong()
	await service.sendRinger(TileVolume.MED)
});

process.on('SIGINT', _ => {
    noble.stopScanning();
    process.exit();
})