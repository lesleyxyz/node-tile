# node-tile
Package to ring & talk to your Tile Tracker

This project is the result of countless hours of reverse engineering the Tile bluetooth protocol.
If you like my work, give this repository a `⭐` or consider [Buying Me A Coffee ☕](https://www.buymeacoffee.com/lesleydk)

# Installation
```bash
npm install node-tile
```

This package can use both [node-ble](https://github.com/chrvadala/node-ble) or [noble](https://github.com/abandonware/noble) to connect to bluetooth.
This means you require a bluetooth adapter.

Based on which bluetooth package you want to use, you might need some additional configuration:


## Node-ble
### Provide permissions
[(Source)](https://github.com/chrvadala/node-ble/tree/main#provide-permissions)
In order to allow a connection with the DBus daemon, you have to set up right permissions.

Create the file `/etc/dbus-1/system.d/node-ble.conf` with the following content (customize with userid)

```xml
<!DOCTYPE busconfig PUBLIC "-//freedesktop//DTD D-BUS Bus Configuration 1.0//EN"
  "http://www.freedesktop.org/standards/dbus/1.0/busconfig.dtd">
<busconfig>
  <policy user="%userid%">
   <allow own="org.bluez"/>
    <allow send_destination="org.bluez"/>
    <allow send_interface="org.bluez.GattCharacteristic1"/>
    <allow send_interface="org.bluez.GattDescriptor1"/>
    <allow send_interface="org.freedesktop.DBus.ObjectManager"/>
    <allow send_interface="org.freedesktop.DBus.Properties"/>
  </policy>
</busconfig>
```

## Noble
###  Running without root/sudo (Linux-specific)
[(Source)](https://github.com/noble/noble#running-on-linux)
To use this package on linux, you will have to run the script as root to get access to your bluetooth adapter.
Otherwise you will get the error that the noble adapter's state is unauthorized.

You can also fix this by running the following command:

```sh
sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
```

This grants the `node` binary `cap_net_raw` privileges, so it can start/stop BLE advertising.

__Note:__ The above command requires `setcap` to be installed.
It can be installed the following way:

 * apt: `sudo apt-get install libcap2-bin`
 * yum: `su -c \'yum install libcap2-bin\'`
You will have to checkout the [noble documentation](https://github.com/noble/noble#running-on-linux) on how to configure NodeJS to use a Bluetooth Adapter.

# Usage
See [example.js](example.js) or [example-noble.js](example-noble.js).
Once you have a connected service, you can do the following:

Make your tile ring:
```
await service.sendRinger(TileVolume.MED)
```

Program the default ring tone:
```
await service.sendRinger(TileVolume.MED)
```

Run some code on a single tab on your tile's button:
```js
service.on("singleTab", _ => console.log("Got single tab!"))
```

Double tab:
```js
service.on("doubleTab", _ => console.log("Got double tab!"))
```

On signal strength/RSSI update **reported by bluetooth adapter**
> only supported by noble, NOT node-ble
```js
service.on("rssi", rssi => console.log("rssi", rssi))
```

On signal strength/RSSI update **reported by your tile**
```js
service.on("tileRssi", rssi => console.log("tileRssi", rssi))
```

Get debug output:
```js
service.on("debug", msg => console.log("debug", msg))
```


# Features
- Make your Tile ring
- Get the signal strength to your Tile (only available using noble)
- Act on the event you single click your Tile button
- Act on the event you double click your Tile button
- Program the "Bionic Birdie" song

# Tested & working with
- Tile Slim 2022
- Tile Pro 2022
- Tile Mate 2022

This package may not work with all Tiles as the protocol changes over time.
Also the level of success may vary depending on your bluetooth adapter and tile.