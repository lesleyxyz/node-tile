# Tile Protocol
This document will contain an attempt to explain how the communcation works.
If you want to help research & reverse engineer the protocol further, see the `reseach/` folder
@NikeLaosClericus also found [this document describing the spec](https://infocenter.nordicsemi.com/index.jsp?topic=%2Fsdk_nrf5_v16.0.0%2Fgroup___t_o_a___c_o_m_p_a_t_i_b_i_l_i_t_y.html)

## Bluetooth Architecture
Each tile has a service called "feed" with uuid `feed` or `0000feed-0000-1000-8000-00805f9b34fb`.

This server has two characteristics:
MEP_COMMAND_CHAR with UUID `9d410018-35d6-f4dd-ba60-e7bd8dc491c0`
=> To send data to the tile

MEP_RESPONSE_CHAR with UUID `9d410019-35d6-f4dd-ba60-e7bd8dc491c0`
=> To receive data from the tile

## Communication methods
Tile uses their own authentication for their tile.
Before you can send a "ring" to your tile, you will need to be authenticated.

When you aren't authenticated yet, you have a **connectionless channel**.
Once you are authenticated using your _authkey_, you are communicating over a **channel**

```
X: Connectionless communication
C: Channel communication
```

```
T: Tile (messages received from our Tile Tracker)
A: App (messages we send to our Tile Tracker)
```

## Message Types
```
TDI: Tile Data Information
TDG: Tile Diagnostic?
ADVINT: Advertising Interval
PPM: Packets Per Minute?
TCU: Tile Connection Units
TDT: Tile Double Tab
```

## Full Flow
### 1. Information discovery
First step is to discover information about the tile
```
X T->A: TDI: I have some information available (tile id, software, firmware, model)

X A->T: TDI: Give me tileId
X A->T: TDI: Give me software
X A->T: TDI: Give me firmware
X A->T: TDI: Give me model

X T->A: TDI: Here is tileId
X T->A: TDI: Here is software
X T->A: TDI: Here is firmware
X T->A: TDI: Here is model
```

# 2. Authenticatoin
Authentication is done by having a random array of hex values for both the Tile and App.
Each party will send their rand values over.

```
X A->T: AUTH: Here is my randA info
X T->A: AUTH: Here is my randT & sresT info
X A->T: AUTH: ACK, Here is my randA info again
```

We have to save the tile's randT & sresT which we will need for HMAC for all communication. Next step is to switch over to a dedicated channel.

```
X T->A: Open: Use our dedicated channelprefix, channeldata
C A->T: Open: ACK, testing authentication (18 19)
C T->A: Open: ACK, authentication working, hmac(authkey, nonceA) seems OK so here is my featuresAvailable for the toaMep processor & nonceB. Comms ready.
```

Now authentication is successful and we can get more information such as TDG, PPM, ADVINT, TCU.

# 3. Get Additional Data
## TDG (Tile Diagnostic)
```
C A->T: TDG: Send me your diagnostic data
C T->A: TDG: Ok, here is page 1
C T->A: TDG: Ok, here is page X, end of TDG
```

## PPM (Packets Per Minute) + ADVINT (Advertisement Interval)
```
C A->T: PPM: Send me your packets per minute
C A->T: ADVINT: Send me your advertisement interval
C T->A: PPM: Ok, here is my packets per minute
C T->A: ADVINT: Ok, here is my advertisement interval
```

## TCU (Tile Connection Units)
```
C A->T: TCU: Here are your connection settings (min+max interval, slave latency, connSupTimeout)
C T->A: TCU: ACK, sending you the params again to confirm
```