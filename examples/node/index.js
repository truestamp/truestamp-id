// run `npm run build` to generate the library for testing.
const ts = require("../../dist/truestamp-id.js")

const fromHexString = (hexString) => {
    let u = new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
    return u
}

const key = fromHexString("deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef")

async function run() {
    const idData = {
        timestamp: Math.floor(new Date().getTime() / 1000),
        region: "us-east-1",
        environment: "staging",
        shortHash: "deadbeefdeadbeef",
        hashName: "sha2-256",
        id: "294jJ3YUoH1IEEm8GSabOs",
        version: 0,
    }

    const id = await ts.encodeId(idData, key)
    console.log(`Base32 (Crockford) ID:\n${id}\n${id.length} bytes\n`)

    const obj = await ts.decodeId(id, key)
    console.log(JSON.stringify(obj, null, 2))
}

run().catch((err) => console.log(err))
