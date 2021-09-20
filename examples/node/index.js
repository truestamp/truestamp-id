// run `npm run build` to generate the library for testing.
const ts = require("../../dist/truestamp-id.cjs")

async function run() {
    const id1 = await ts.generateNewId()
    console.log(id1)
    console.log(`isValid? : ${ts.isValid(id1)}`)
    console.log(ts.decodeToJSON(id1))

    const id2 = await ts.generateNewId(1, 1, null, 999)
    console.log(id2)
    console.log(`isValid? : ${ts.isValid(id2)}`)
    console.log(ts.decodeToJSON(id2))

    const id3 = await ts.generateNewId(1, 1, null, 999999999)
    console.log(id3)
    console.log(`isValid? : ${ts.isValid(id3)}`)
    console.log(ts.decodeToJSON(id3))

    const pid3 = await ts.decode(id3)
    console.log(pid3)
}

run().catch((err) => console.log(err))
