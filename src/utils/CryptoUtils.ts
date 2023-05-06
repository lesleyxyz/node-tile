import crypto from 'crypto'

export class CryptoUtils {
    static generateRandomBytes(n): Buffer {
        return crypto.randomBytes(n)
    }

    static convertToLongBuffer(int: number): Buffer {
        let bf = Buffer.alloc(8)
        bf.writeBigInt64LE(BigInt(int))
        return bf
    }

    static generateHmac(secret, ...buffers): Buffer {
        let toBuffers = buffers.map(b => {
            if(Buffer.isBuffer(b)) return b;
            return Buffer.from([b])
        })
        
        let padded = Buffer.concat([...toBuffers], 32)
        return crypto.createHmac('sha256', secret).update(padded).digest()
    }
}