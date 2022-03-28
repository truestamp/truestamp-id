// run `npm run build` to generate the library for testing.
const id = require("../../dist/truestamp-id.cjs")
const { ulid } = require("ulidx")

// Samples
const HMAC_KEY = 'deadc44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
const ENVELOPE_HASH = 'beefc44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

async function run() {
    const newId = await id.encode({
        version: 1,
        test: false,
        ulid: ulid(),
        timestamp: 1640995200000000,
        envelopeHash: ENVELOPE_HASH,
        hmacKey: HMAC_KEY,
    })

    console.log(`New ID: ${newId}`)
    console.log(`New ID length: ${newId.length}`)

    console.log(JSON.stringify(id.decode({ id: newId, envelopeHash: ENVELOPE_HASH, hmacKey: HMAC_KEY }), null, 2))
    console.log(`isValid? : ${id.isValid({ id: newId, envelopeHash: ENVELOPE_HASH, hmacKey: HMAC_KEY })}`)

    console.log(JSON.stringify(id.decodeUnsafely({ id: newId }), null, 2))
    console.log(`isValidUnsafely? : ${id.isValidUnsafely({ id: newId })}`)
}

run().catch((err) => console.log(err))
