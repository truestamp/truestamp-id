// run `npm run build` to generate the library for testing.
const ts = require("../../dist/truestamp-id.js")

async function run() {
    const id = await ts.encodeId({
        timestamp: Math.floor(new Date().getTime() / 1000),
        region: "us-east-1",
        environment: "staging",
        shortHash: "deadbeefdeadbeef",
        hashName: "sha2-256",
        qldbId: "294jJ3YUoH1IEEm8GSabOs",
        qldbVersion: 0,
    })
    console.log(`Base32 (Crockford) ID:\n${id}\n${id.length} bytes\n`)

    const obj = await ts.decodeId(id)
    console.log(JSON.stringify(obj, null, 2))
}

run().catch((err) => console.log(err))
