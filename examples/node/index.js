// run `npm run build` to generate the library for testing.
const id = require("../../dist/truestamp-id.cjs")
const { ulid } = require("ulidx")

async function run() {
    const newId = await id.encode({ env: 'live', ulid: ulid(), timestamp: 1640995200000000 })
    console.log(newId)
    console.log(`isValid? : ${id.isValid(newId)}`)
    console.log(JSON.stringify(id.decode(newId), null, 2))
}

run().catch((err) => console.log(err))
