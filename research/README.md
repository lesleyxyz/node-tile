# Research
Here you can find various tools & findings I made.
Feel free to use them and contribute to them

# Tools used
I used three methods for reverse engineering this protocol for this library.

## 1. Static code analysis by reverse engineering using jadx
First download [jadx-gui](https://github.com/skylot/jadx)

Here you can drop the APK to start inspecting the Tile app code.
Do note that all the variable names & function names will be mangled.

You could use the latest Tile APK, but if you don't want to mess around with variable names etc, feel free to use my jadx project files which already has comments & renamed variable names & functions. This is located in the `research/jadx/` folder.

The main logic of the protocol is in the following locations:
- `com.thetileapp.tile.ble.gatt.BaseBleGattCallback`
- `com.thetileapp.tile.ble.gatt.TileBleGattCallback`
- `f.a`


## 2. Dynamic analysis using frida
Frida is a very useful tool to hook into functions and change an app behaviour dynamically. I used it to log the exact bluetooth traffic that occurs between the App and the Tile.

To dynamically analyse the Tile app you will need:
- A rooted phone
- Frida on your phone & pc

[Here](https://book.hacktricks.xyz/mobile-pentesting/android-app-pentesting/frida-tutorial) is a good resource to get to know Frida.


### Install on your PC
```bash
pip install frida-tools
pip install frida
frida-ls-devices
```

### Install on android
1. Download the frida server binary from [here](https://github.com/frida/frida/releases).
You are looking for `frida-server-{version}-android-{arch}.xz` where:
    - {version} is the latest frida server version
    - {arch} is your android architecture
    - You can get your android architecture by running `adb shell getprop ro.product.cpu.abi`

2. Extract the frida server from the `.xz` archive and rename it to `frida-server`
3. Install frida on your phone by executing:
    ```bash
    adb push frida-server /data/local/tmp
    adb shell

    su
    cd /data/local/tmp
    chmod +x frida-server
    ./frida-server
    ```
    If you get the error `VM::AttachCurrentThread failed: -1` run 
    
    `setprop persist.device_config.runtime_native.usap_pool_enabled false`
    
    If you have magiskhide, run

    `magiskhide disable`

### Using frida
Start monitoring trafic by running thee frida script in `research/frida/blemon.js` by doing:
```bash
frida -l research/frida/blemon.js -f com.thetileapp.tile
%resume
```
Then all bluetooth traffic will be dumped in your terminal.
This has only been tested on the APK in `research/jadx/`

## 3. HTTP inspection using http-toolkig
You can download HTTP Toolkit [here](https://httptoolkit.com/)
Once installed, connect your phone using USB and select `Android device via ADB`.
Now you can sniff all the traffic that happens on your phone.

It's recommended to have a rooted device for this so you can inspect https.