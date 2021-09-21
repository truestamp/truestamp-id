// run `npm run build` to generate the library for testing.
const id = require("../../dist/truestamp-id.cjs")
const { ulid } = require("ulidx")

async function run() {
    const id1 = await id.generate()
    console.log(id1)
    console.log(`isValid? : ${id.isValid(id1)}`)
    console.log(id.decode(id1))

    console.log(`\n`)

    const id2 = await id.generate({ ulid: ulid(), version: 999, env: 'development', region: 'us-west-2' })
    console.log(id2)
    console.log(`isValid? : ${id.isValid(id2)}`)
    console.log(id.decode(id2))

    console.log(`\n`)

    console.log(JSON.stringify(id.decode(id1), null, 2))

    const pid2 = await id.decode(id2)
    console.log(pid2)
}

run().catch((err) => console.log(err))
