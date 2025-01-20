import noble from '@abandonware/noble'
import {TileServiceNoble, TileVolume, UserService} from 'node-tile'

// We have to log into Tile to get the authkeys of your tile
const userService = new UserService("<email>", "<password>")
await userService.login()

const tiles = await userService.getTiles()
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

	// Create the service based on bluetooth device
	let bleTile = new TileServiceNoble(peripheral)
	bleTile.on("debug", msg => console.log("debug", msg))

	if(!bleTile.isTile()){
		console.log("Non-tile", address, peripheral.advertisement)
		return
	}

	if(!bleTile.isTileActivated()) {
		console.log("Non-activated tile, please activate in app first", address)
		return
	}

	console.log("TILE FOUND", peripheral.address);

	// To be able to get the tileId, we have to connect to the tile
	noble.stopScanning()
	await bleTile.connect()

	// Based on the tileId, we can find the tile in our account
	let tileId = await bleTile.getTileId()
	let accTile = tiles.filter(t => t.id.startsWith(tileId))[0]
	if(!accTile){
		console.log("Tile not found in account", tileId)
		return
	}

	await bleTile.authenticate(accTile)

	bleTile.on("singleTab", _ => console.log("Got single tab!"))
	bleTile.on("doubleTab", _ => console.log("Got double tab!"))
	bleTile.on("rssi", rssi => console.log("rssi", rssi))
	bleTile.on("tileRssi", rssi => console.log("tileRssi", rssi))

	await bleTile.sendRinger(TileVolume.MED)
});

process.on('SIGINT', _ => {
    noble.stopScanning();
    process.exit();
})