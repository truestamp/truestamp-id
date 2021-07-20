// Copyright 2021 Truestamp Inc. All Rights Reserved.

const ts = require("../dist/truestamp-id.js")

const environments = ['development', 'staging', 'production'];
const regions = ['us-east-1'];
const hashTypes = ['sha1', 'sha2-256', 'sha2-512', 'sha3-256', 'sha3-384', 'sha3-512'];

const fromHexString = (hexString) => {
    let u = new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
    return u
}

const randomHex = (length = 16) => {
    // Declare all characters
    let chars = 'abcdef0123456789';

    // Pick characters randomly
    let str = '';
    for (let i = 0; i < length; i++) {
        str += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return str;

};

const randomBase62 = (length = 22) => {
    // Declare all characters
    let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    // Pick characters randomly
    let str = '';
    for (let i = 0; i < length; i++) {
        str += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return str;

};

describe("Encoding and decoding", () => {
    test("works both ways with 256 iterations of random valid data", async () => {
        for (let i = 0; i < 256; i++) {
            const key = fromHexString("deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef")

            const randEnvIndex = Math.floor(Math.random() * environments.length)
            const randRegionIndex = Math.floor(Math.random() * regions.length)
            const randHashTypeIndex = Math.floor(Math.random() * hashTypes.length)
            const randVersion = Math.floor(Math.random() * 1000)

            let idData = {
                timestamp: Math.floor(new Date().getTime() / 1000),
                region: regions[randRegionIndex],
                environment: environments[randEnvIndex],
                shortHash: randomHex(16),
                hashName: hashTypes[randHashTypeIndex],
                qldbId: randomBase62(22),
                qldbVersion: randVersion,
            }

            let id = await ts.encodeId(idData, key, true)
            // console.log(id)
            let decodedIdData = await ts.decodeId(id, key)
            // console.log(decodedIdData)
            expect(decodedIdData).toEqual(idData)
        }
    })
})

describe("Test vector", () => {
    test("decodes to the expected value", async () => {
        const key = fromHexString("deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef")
        const id = "truestamp8V382DKSDZJ7093ARFAPQ6NEWXWDNRTRVXYB77ADG18R4MC9GDCT3893ZFSTE50D24HV3N42WKH593R0TEJAHD320DSSYJH3SCP778VCHD2WR043YR7QR"

        const expected = {
            timestamp: 1626751407,
            region: 'us-east-1',
            environment: 'production',
            shortHash: '032080886bf3f264',
            hashName: 'sha3-512',
            qldbId: 'epcseHP5bZfs07Ly29j72k',
            qldbVersion: 418
        }

        let decodedIdData = await ts.decodeId(id, key)

        expect(decodedIdData).toMatchObject(expected)
    })

    test("decode fails if invalid key provided", async () => {
        // first byte of key is wrong
        let key = fromHexString("ffadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef")
        let id = "truestamp8V382DKSDZJ7093ARFAPQ6NEWXWDNRTRVXYB77ADG18R4MC9GDCT3893ZFSTE50D24HV3N42WKH593R0TEJAHD320DSSYJH3SCP778VCHD2WR043YR7QR"

        await expect(async () => {
            await ts.decodeId(id, key)
        }).rejects.toThrow("Invalid ID [mac]");
    })

})

describe("Test prefix", () => {
    test("is present when unset", async () => {
        const key = fromHexString("deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef")

        const idData = {
            timestamp: 1626751407,
            region: 'us-east-1',
            environment: 'production',
            shortHash: '032080886bf3f264',
            hashName: 'sha3-512',
            qldbId: 'epcseHP5bZfs07Ly29j72k',
            qldbVersion: 418
        }

        // no third parameter
        let id = await ts.encodeId(idData, key)
        expect(id.startsWith("truestamp")).toBe(true)

        let decodedIdData = await ts.decodeId(id, key)
        expect(decodedIdData).toMatchObject(idData)
    })

    test("is present when true", async () => {
        const key = fromHexString("deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef")

        const idData = {
            timestamp: 1626751407,
            region: 'us-east-1',
            environment: 'production',
            shortHash: '032080886bf3f264',
            hashName: 'sha3-512',
            qldbId: 'epcseHP5bZfs07Ly29j72k',
            qldbVersion: 418
        }

        // third parameter is true
        let id = await ts.encodeId(idData, key, true)
        expect(id.startsWith("truestamp")).toBe(true)

        let decodedIdData = await ts.decodeId(id, key)
        expect(decodedIdData).toMatchObject(idData)
    })

    test("is not present when false", async () => {
        const key = fromHexString("deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef")

        const idData = {
            timestamp: 1626751407,
            region: 'us-east-1',
            environment: 'production',
            shortHash: '032080886bf3f264',
            hashName: 'sha3-512',
            qldbId: 'epcseHP5bZfs07Ly29j72k',
            qldbVersion: 418
        }

        // third parameter is false
        let id = await ts.encodeId(idData, key, false)
        expect(id.startsWith("truestamp")).toBe(false)

        let decodedIdData = await ts.decodeId(id, key)
        expect(decodedIdData).toMatchObject(idData)
    })


})

describe("encodeId fails when given", () => {
    test("invalid timestamp", async () => {
        const key = fromHexString("deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef")

        const idData = {
            timestamp: 4000000000,
            region: 'us-east-1',
            environment: 'production',
            shortHash: '032080886bf3f264',
            hashName: 'sha3-512',
            qldbId: 'epcseHP5bZfs07Ly29j72k',
            qldbVersion: 418
        }

        // no third parameter
        await expect(async () => {
            await ts.encodeId(idData, key)
        }).rejects.toThrow("timestamp");
    })

    test("invalid region", async () => {
        const key = fromHexString("deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef")

        const idData = {
            timestamp: 1626751407,
            region: 'us-nowhere-1',
            environment: 'production',
            shortHash: '032080886bf3f264',
            hashName: 'sha3-512',
            qldbId: 'epcseHP5bZfs07Ly29j72k',
            qldbVersion: 418
        }

        // no third parameter
        await expect(async () => {
            await ts.encodeId(idData, key)
        }).rejects.toThrow("region");
    })

    test("invalid environment", async () => {
        const key = fromHexString("deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef")

        const idData = {
            timestamp: 1626751407,
            region: 'us-east-1',
            environment: 'foo',
            shortHash: '032080886bf3f264',
            hashName: 'sha3-512',
            qldbId: 'epcseHP5bZfs07Ly29j72k',
            qldbVersion: 418
        }

        // no third parameter
        await expect(async () => {
            await ts.encodeId(idData, key)
        }).rejects.toThrow("environment");
    })

    test("invalid shortHash - too short", async () => {
        const key = fromHexString("deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef")

        const idData = {
            timestamp: 1626751407,
            region: 'us-east-1',
            environment: 'production',
            shortHash: '032080886bf3f2',
            hashName: 'sha3-512',
            qldbId: 'epcseHP5bZfs07Ly29j72k',
            qldbVersion: 418
        }

        // no third parameter
        await expect(async () => {
            await ts.encodeId(idData, key)
        }).rejects.toThrow("shortHash/minLength");
    })

    test("invalid shortHash - too long", async () => {
        const key = fromHexString("deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef")

        const idData = {
            timestamp: 1626751407,
            region: 'us-east-1',
            environment: 'production',
            shortHash: '032080886bf3f26499',
            hashName: 'sha3-512',
            qldbId: 'epcseHP5bZfs07Ly29j72k',
            qldbVersion: 418
        }

        // no third parameter
        await expect(async () => {
            await ts.encodeId(idData, key)
        }).rejects.toThrow("shortHash/maxLength");
    })

    test("invalid hashName", async () => {
        const key = fromHexString("deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef")

        const idData = {
            timestamp: 1626751407,
            region: 'us-east-1',
            environment: 'production',
            shortHash: '032080886bf3f264',
            hashName: 'sha3-999',
            qldbId: 'epcseHP5bZfs07Ly29j72k',
            qldbVersion: 418
        }

        // no third parameter
        await expect(async () => {
            await ts.encodeId(idData, key)
        }).rejects.toThrow("Unrecognized hash function");
    })

    test("invalid qldbId - too short", async () => {
        const key = fromHexString("deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef")

        const idData = {
            timestamp: 1626751407,
            region: 'us-east-1',
            environment: 'production',
            shortHash: '032080886bf3f264',
            hashName: 'sha3-256',
            qldbId: 'epcseHP5bZfs07Ly29j72',
            qldbVersion: 418
        }

        // no third parameter
        await expect(async () => {
            await ts.encodeId(idData, key)
        }).rejects.toThrow("qldbId/minLength");
    })

    test("invalid qldbId - too long", async () => {
        const key = fromHexString("deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef")

        const idData = {
            timestamp: 1626751407,
            region: 'us-east-1',
            environment: 'production',
            shortHash: '032080886bf3f264',
            hashName: 'sha3-256',
            qldbId: 'epcseHP5bZfs07Ly29j72kZ',
            qldbVersion: 418
        }

        // no third parameter
        await expect(async () => {
            await ts.encodeId(idData, key)
        }).rejects.toThrow("qldbId/maxLength");
    })

    test("invalid qldbVersion - too high", async () => {
        const key = fromHexString("deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef")

        const idData = {
            timestamp: 1626751407,
            region: 'us-east-1',
            environment: 'production',
            shortHash: '032080886bf3f264',
            hashName: 'sha3-256',
            qldbId: 'epcseHP5bZfs07Ly29j72k',
            qldbVersion: 999999999999999
        }

        // no third parameter
        await expect(async () => {
            await ts.encodeId(idData, key)
        }).rejects.toThrow("qldbVersion/maximum");
    })


})

describe("encodeId fails when given", () => {
    test("missing key", async () => {
        const key = undefined
        const idData = {
            timestamp: 1626751407,
            region: 'us-east-1',
            environment: 'production',
            shortHash: '032080886bf3f264',
            hashName: 'sha3-512',
            qldbId: 'epcseHP5bZfs07Ly29j72k',
            qldbVersion: 418
        }

        await expect(async () => {
            await ts.encodeId(idData, key)
        }).rejects.toThrow("Missing key");
    })

    test("key too short", async () => {
        // removed the first byte of the key
        const key = fromHexString("adbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef")
        const idData = {
            timestamp: 1626751407,
            region: 'us-east-1',
            environment: 'production',
            shortHash: '032080886bf3f264',
            hashName: 'sha3-512',
            qldbId: 'epcseHP5bZfs07Ly29j72k',
            qldbVersion: 418
        }

        // no third parameter
        await expect(async () => {
            await ts.encodeId(idData, key)
        }).rejects.toThrow("Invalid key length");
    })

    test("key too long", async () => {
        // added more before first byte of the key
        const key = fromHexString("dddeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef")
        const idData = {
            timestamp: 1626751407,
            region: 'us-east-1',
            environment: 'production',
            shortHash: '032080886bf3f264',
            hashName: 'sha3-512',
            qldbId: 'epcseHP5bZfs07Ly29j72k',
            qldbVersion: 418
        }

        // no third parameter
        await expect(async () => {
            await ts.encodeId(idData, key)
        }).rejects.toThrow("Invalid key length");
    })


})

describe("decodeId fails when given", () => {
    test("missing key", async () => {
        const key = undefined
        const id = "truestamp8V382DKSDZJ7093ARFAPQ6NEWXWDNRTRVXYB77ADG18R4MC9GDCT3893ZFSTE50D24HV3N42WKH593R0TEJAHD320DSSYJH3SCP778VCHD2WR043YR7QR"

        await expect(async () => {
            await ts.decodeId(id, key)
        }).rejects.toThrow("Missing key");
    })

    test("key too short", async () => {
        // removed the first byte of the key
        const key = fromHexString("adbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef")
        const id = "truestamp8V382DKSDZJ7093ARFAPQ6NEWXWDNRTRVXYB77ADG18R4MC9GDCT3893ZFSTE50D24HV3N42WKH593R0TEJAHD320DSSYJH3SCP778VCHD2WR043YR7QR"

        await expect(async () => {
            await ts.decodeId(id, key)
        }).rejects.toThrow("Invalid key length");
    })

    test("key too long", async () => {
        // added more before first byte of the key
        const key = fromHexString("dddeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef")
        const id = "truestamp8V382DKSDZJ7093ARFAPQ6NEWXWDNRTRVXYB77ADG18R4MC9GDCT3893ZFSTE50D24HV3N42WKH593R0TEJAHD320DSSYJH3SCP778VCHD2WR043YR7QR"

        await expect(async () => {
            await ts.decodeId(id, key)
        }).rejects.toThrow("Invalid key length");
    })


})
