// Copyright © 2021 Truestamp Inc. All Rights Reserved.

const ts = require("../dist/truestamp-id.umd.js")

describe("Decoding", () => {
    test("can decode simple ID", async () => {
        const sampleId = "T1201FFZSB24K0QMTG2YBW3A6DYYR_0"
        expect(ts.isValid(sampleId)).toBeTruthy()

        const id = ts.decode(sampleId)

        expect(id.prefix).toEqual('T')
        expect(id.env).toEqual(1) // 1 = production
        expect(id.region).toEqual(2) // 2 = US_EAST_1
        expect(id.ulid).toEqual('01FFZSB24K0QMTG2YBW3A6DYYR')
        expect(id.version).toEqual(0)
    })

    test("can decode simple ID with large version", async () => {
        const sampleId = "T1201FFZSB24K0QMTG2YBW3A6DYYR_999999999"
        expect(ts.isValid(sampleId)).toBeTruthy()

        const id = ts.decode(sampleId)

        expect(id.prefix).toEqual('T')
        expect(id.env).toEqual(1) // 1 = production
        expect(id.region).toEqual(2) // 2 = US_EAST_1
        expect(id.ulid).toEqual('01FFZSB24K0QMTG2YBW3A6DYYR')
        expect(id.version).toEqual(999999999)
    })
})

describe("Encoding", () => {
    test("can create simple ID with defaults", async () => {
        const id = ts.generateNewId()
        expect(ts.isValid(id)).toBeTruthy()

        const decoded = ts.decode(id)
        expect(decoded.prefix).toEqual('T')
        expect(decoded.env).toEqual(1) // 1 = production
        expect(decoded.region).toEqual(2) // 2 = US_EAST_1
        expect(decoded.ulid.length).toEqual(26)
        expect(decoded.version).toEqual(0)
    })

    test("can create ID with params", async () => {
        const id = ts.generateNewId('01FFZSB24K0QMTG2YBW3A6DYYR', 999, 'production', 'us-east-1')
        expect(ts.isValid(id)).toBeTruthy()

        const decoded = ts.decode(id)
        expect(decoded.prefix).toEqual('T')
        expect(decoded.env).toEqual(1) // 1 = production
        expect(decoded.region).toEqual(2) // 2 = us-east-1
        expect(decoded.ulid.length).toEqual(26)
        expect(decoded.ulid).toEqual('01FFZSB24K0QMTG2YBW3A6DYYR')
        expect(decoded.version).toEqual(999)
    })

    test("can detect invalid environment", async () => {
        const t = () => {
            const id = ts.generateNewId('01FFZSB24K0QMTG2YBW3A6DYYR', 0, 'foo', 'us-east-1')
        };
        expect(t).toThrow(Error);
        expect(t).toThrow("Invalid environment");
    })

    test("can detect invalid region", async () => {
        const t = () => {
            const id = ts.generateNewId('01FFZSB24K0QMTG2YBW3A6DYYR', 0, 'production', 'foo')
        };
        expect(t).toThrow(Error);
        expect(t).toThrow("Invalid region");
    })

    test("can detect invalid ULID", async () => {
        const t = () => {
            const id = ts.generateNewId('foo', 0, 'production', 'us-east-1')
        };
        expect(t).toThrow(Error);
        expect(t).toThrow("Invalid ULID");
    })

    test("can detect invalid version", async () => {
        const t = () => {
            const id = ts.generateNewId('01FFZSB24K0QMTG2YBW3A6DYYR', 'foo', 'production', 'us-east-1')
        };
        expect(t).toThrow(Error);
        expect(t).toThrow("Invalid version");
    })
})
