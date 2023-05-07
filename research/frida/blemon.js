setTimeout(_ =>  { Java.perform(perform); }, 1000);
let bleCharMap = {
    "00002a19-0000-1000-8000-00805f9b34fb": "batteryLevel",
    "00002a24-0000-1000-8000-00805f9b34fb": "modelNumber",
    "00002a25-0000-1000-8000-00805f9b34fb": "serialNumber",
    "00002a26-0000-1000-8000-00805f9b34fb": "firmwareRev",
    "00002a27-0000-1000-8000-00805f9b34fb": "hardwareRev",
    "00002a28-0000-1000-8000-00805f9b34fb": "softwareRev",
    "9d410007-35d6-f4dd-ba60-e7bd8dc491c0": "tileId",
    "9d410002-35d6-f4dd-ba60-e7bd8dc491c0": "song",
    "9d41000D-35d6-f4dd-ba60-e7bd8dc491c0": "mode",
    "9d41000E-35d6-f4dd-ba60-e7bd8dc491c0": "factory",
    "9d41000F-35d6-f4dd-ba60-e7bd8dc491c0": "rand",
    "9d410010-35d6-f4dd-ba60-e7bd8dc491c0": "sres",
    "9d410005-35d6-f4dd-ba60-e7bd8dc491c0": "connParams",
    "9d410008-35d6-f4dd-ba60-e7bd8dc491c0": "flash",
    "9d410011-35d6-f4dd-ba60-e7bd8dc491c0": "diagnostics",
    "9d410013-35d6-f4dd-ba60-e7bd8dc491c0": "ppm",
    "9d410015-35d6-f4dd-ba60-e7bd8dc491c0": "toaCommand",
    "9d410016-35d6-f4dd-ba60-e7bd8dc491c0": "toaResponse",
    "9d410018-35d6-f4dd-ba60-e7bd8dc491c0": "mepCommand",
    "9d410019-35d6-f4dd-ba60-e7bd8dc491c0": "mepResponse",
}

function getToaType(prefix) {
    switch (prefix) {
        case 0:
            return "TOA_RSP_RESERVED";
        case 1:
            return "TOA_RSP_READY";
        case 2:
            return "TOA_RSP_TOFU_CTL";
        case 3:
            return "TOA_RSP_ASSERT";
        case 4:
            return "TOA_RSP_BDADDR";
        case 5:
            return "TOA_RSP_ERROR";
        case 6:
            return "TOA_RSP_TDT";
        case 7:
            return "TOA_RSP_SONG";
        case 8:
            return "TOA_RSP_PPM";
        case 9:
            return "TOA_RSP_ADV_INT";
        case 10:
            return "TOA_RSP_TKA";
        case 11:
            return "TOA_RSP_TAC";
        case 12:
            return "TOA_RSP_TDG";
        case 13:
            return "TOA_RSP_TMD";
        case 14:
            return "TOA_RSP_TCU";
        case 15:
            return "TOA_RSP_TIME";
        case 16:
            return "TOA_RSP_TEST";
        case 17:
            return "TOA_RSP_TFC";
        case 18:
            return "TOA_RSP_OPEN_CHANNEL";
        case 19:
            return "TOA_RSP_CLOSE_CHANNEL";
        case 20:
            return "TOA_RSP_TDI";
        case 21:
            return "TOA_RSP_AUTHENTICATE";
        case 22:
        case 23:
        case 24:
        default:
            return "RESPONSE_NOT_FOUND";
        case 25:
            return "TOA_RSP_TRM";
        case 26:
            return "TOA_RSP_TPC";
        case 27:
            return "TOA_RSP_ASSOCIATE";
        case 28:
            return "TOA_RSP_AUTHORIZE";
        case 29:
            return "TOA_RSP_TUC_DEPRECATED";
        case 30:
            return "TOA_RSP_TUC";
    }
}

//let log = "e255142659509cab"

function perform(){
    console.log("performing")

    let BaseBleGattCallback = Java.use("com.thetileapp.tile.ble.gatt.BaseBleGattCallback");
    BaseBleGattCallback["n"].implementation = function () {
        let generalPrefix = arguments[0]
        let bytes = arguments[1]
        let tileId = this._k.value
        //if(tileId != log) return

        console.log(this._k.value, 'sendPackets', generalPrefix, bytes[0], javaBytesToStr(bytes));
        return this.n(...arguments);
    };

    BaseBleGattCallback.onCharacteristicChanged.implementation = function () {
        let charUuid = arguments[1].getUuid()
        let charName = bleCharMap[charUuid] || charUuid
        let bytes = arguments[1].getValue()
        let channelId = bytes[0]
        let toaType = bytes[1]
        let tileId = this._k.value
        //if(tileId != log) return

        console.log(this._k.value, 'char RX', charName, getToaType(toaType), javaBytesToStr(bytes)); 
        return this.onCharacteristicChanged(...arguments);
    };

    BaseBleGattCallback["m"].implementation = function () {
        let generalPrefix = arguments[0]
        let bytes = arguments[1]
        let tileId = this._k.value
        //if(tileId != log) return
        console.log(this._k.value, 'sendPacketsPreAuth', generalPrefix, bytes[0], javaBytesToStr(bytes));
        return this.m(...arguments);
    };

    let TileBleGattCallback = Java.use("com.thetileapp.tile.ble.gatt.TileBleGattCallback");
    TileBleGattCallback["onDescriptorWrite"].implementation = function () {
        let uuid = arguments[1].getCharacteristic().getUuid()
        let name = bleCharMap[uuid] || uuid

        let tileId = this._k.value
        //if(tileId != log) return
        console.log(this._k.value, 'onDescriptorWrite', name);
        return this.onDescriptorWrite(...arguments);
    }

    BaseBleGattCallback["q0"].implementation = function () {
        let bleCharUuid = arguments[0].getUuid()
        let bleCharName = bleCharMap[bleCharUuid] || bleCharUuid
        let bytes = javaBytesToStr(arguments[1])
        let tileId = this._k.value
        //if(tileId != log) return
        console.log(this._k.value, 'char TX', bleCharName, bytes);
        return this.q0(...arguments);
    }
    
    let TileCryptoManager = Java.use("com.tile.toa.processor.TileCryptoManager");
    TileCryptoManager["d"].implementation = function (bArr, bArr2, bArr3, bArr4, bArr5) {
        //console.log('hmacMultiple4but4arr' + ', ' + 'bArr: ' + javaBytesToStr(bArr) + ', ' + 'bArr2: ' + javaBytesToStr(bArr2) + ', ' + 'bArr3: ' + javaBytesToStr(bArr3) + ', ' + 'bArr4: ' + javaBytesToStr(bArr4) + ', ' + 'bArr5: ' + javaBytesToStr(bArr5));
        let ret = this.d(bArr, bArr2, bArr3, bArr4, bArr5);
        //console.log('hmacMultiple4but4arr ret', javaBytesToStr(ret));
        return ret;
    }

    let CryptoUtils = Java.use("com.tile.utils.common.CryptoUtils");
    CryptoUtils["b"].implementation = function (secretKey, data) {
        //console.log('getHmacSHA256' + ', ' + 'secretKey: ' + javaBytesToStr(secretKey) + ', ' + 'data: ' + javaBytesToStr(data));
        let ret = this.b(secretKey, data);
        //console.log('getHmacSHA256', javaBytesToStr(ret));
        return ret;
    }
}

function javaBytesToStr(bytes){
    let newBytes = []
    for (var i = 0; i < bytes.length; i++) {
        newBytes.push(decimalToHexString(bytes[i]))
    }
    return newBytes
}

function decimalToHexString(number) {
    if (number < 0) {
        number = 0xFFFFFFFF + number + 1;
    }

    return number.toString(16).toUpperCase().padStart(2, '0').slice(-2);
}

function printStackTrace(){
    console.log(Java.use("android.util.Log").getStackTraceString(Java.use("java.lang.Exception").$new()))
}