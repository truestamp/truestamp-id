var ts = require("../dist/truestamp-id.js")

const environments = ['development', 'staging', 'production'];
const regions = ['us-east-1'];
const hashTypes = ['sha1', 'sha2-256', 'sha2-512', 'sha3-256', 'sha3-384', 'sha3-512'];

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

describe("Encoding and Decoding", () => {
    test("works both ways with random valid data", async () => {
        for (let i = 0; i < 1000; i++) {
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

            let id = await ts.encodeId(idData)
            console.log(id)
            let decodedIdData = await ts.decodeId(id)
            console.log(decodedIdData)
            expect(decodedIdData).toEqual(idData)
        }

    })
})

describe("Test Vector", () => {
    test("decodes to the expected value", async () => {
        let id = "truestampSY2RSYSWG3K5N2VGFRDMRXS0R1WDNRV8ZSXBV7ADG18R4MC9RFT18MZHWTHV3VGT893655GY860WK4F58P74K599570ZJVM597WNAQNY2R5SJ04CC482W"

        let expected = {
            timestamp: 1626733187,
            region: 'us-east-1',
            environment: 'production',
            shortHash: '35ca0273b3c55d47',
            hashName: 'sha2-256',
            qldbId: '9HRQcYwrAbyddSoFqbozJM',
            qldbVersion: 289
        }

        let decodedIdData = await ts.decodeId(id)

        expect(decodedIdData).toEqual(expected)
    })
})
