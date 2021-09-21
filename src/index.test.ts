// Copyright © 2021 Truestamp Inc. All Rights Reserved.
const { ulid } = require("ulidx");

const id = require("../dist/truestamp-id.umd.js")

describe("Decoding", () => {
    test("can decode simple ID", async () => {
        const testId = "T1201FFZSB24K0QMTG2YBW3A6DYYR_0"
        expect(id.isValid(testId)).toBeTruthy()

        const decoded = id.decode(testId)

        expect(decoded.prefix).toEqual('T')
        expect(decoded.env).toEqual('production')
        expect(decoded.region).toEqual('us-east-1')
        expect(decoded.ulid).toEqual('01FFZSB24K0QMTG2YBW3A6DYYR')
        expect(decoded.version).toEqual(0)
    })

    test("can decode simple ID with large version", async () => {
        const sampleId = "T1201FFZSB24K0QMTG2YBW3A6DYYR_999999999"
        expect(id.isValid(sampleId)).toBeTruthy()

        const decoded = id.decode(sampleId)

        expect(decoded.prefix).toEqual('T')
        expect(decoded.env).toEqual('production')
        expect(decoded.region).toEqual('us-east-1')
        expect(decoded.ulid).toEqual('01FFZSB24K0QMTG2YBW3A6DYYR')
        expect(decoded.version).toEqual(999999999)
    })

    test("can detect invalid ID", async () => {
        const t = () => {
            id.decode('foo')
        };
        expect(t).toThrow(Error);
        expect(t).toThrow("Invalid ID");
    })

})

describe("Encoding", () => {
    test("can create simple ID with defaults", async () => {
        const testId = id.generate()
        expect(id.isValid(testId)).toBeTruthy()

        const decoded = id.decode(testId)
        expect(decoded.prefix).toEqual('T')
        expect(decoded.env).toEqual('production')
        expect(decoded.region).toEqual('us-east-1')
        expect(decoded.ulid.length).toEqual(26)
        expect(decoded.version).toEqual(0)
    })

    test("can create ID with params", async () => {
        const u = ulid()
        const testId = id.generate({ ulid: u, version: 999, env: 'development', region: 'us-west-2' })
        expect(id.isValid(testId)).toBeTruthy()

        const decoded = id.decode(testId)
        expect(decoded.prefix).toEqual('T')
        expect(decoded.env).toEqual('development')
        expect(decoded.region).toEqual('us-west-2')
        expect(decoded.ulid.length).toEqual(26)
        expect(decoded.ulid).toEqual(u)
        expect(decoded.version).toEqual(999)
    })

    test("can detect invalid environment", async () => {
        const t = () => {
            id.generate({ env: 'foo' })
        };
        expect(t).toThrow(Error);
        expect(t).toThrow("Invalid environment");
    })

    test("can detect invalid region", async () => {
        const t = () => {
            id.generate({ region: 'foo' })
        };
        expect(t).toThrow(Error);
        expect(t).toThrow("Invalid region");
    })

    test("can detect invalid ULID", async () => {
        const t = () => {
            id.generate({ ulid: 'foo' })
        };
        expect(t).toThrow(Error);
        expect(t).toThrow("Invalid ULID");
    })

    test("can detect invalid version", async () => {
        const t = () => {
            id.generate({ version: '0' })
        };
        expect(t).toThrow(Error);
        expect(t).toThrow("Invalid version");
    })
})
