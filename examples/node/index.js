// run `npm run build` to generate the library for testing.
const ts = require("../../dist/truestamp-id.cjs")
const { ulid } = require("ulidx")

async function run() {
    const id1 = await ts.generateNewId()
    console.log(id1)
    console.log(`isValid? : ${ts.isValid(id1)}`)
    console.log(ts.decodeToJSON(id1))

    const id2 = await ts.generateNewId(ulid(), 0, 'production', 'us-east-1')
    console.log(id2)
    console.log(`isValid? : ${ts.isValid(id2)}`)
    console.log(ts.decodeToJSON(id2))

    const pid2 = await ts.decode(id2)
    console.log(pid2)
}

run().catch((err) => console.log(err))
