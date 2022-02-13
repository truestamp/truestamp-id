// Copyright © 2021-2022 Truestamp Inc. All Rights Reserved.

const { ulid } = require("ulidx");
const id = require("../dist/truestamp-id.umd.js");

describe("the decode() function", () => {
  test("can decode simple Id", async () => {
    const t = "truestamp_live_01FFZSB24K0QMTG2YBW3A6DYYR_1644772755000000";

    const decoded = id.decode(t);

    expect(decoded.env).toEqual("live");
    expect(decoded.ulid).toEqual("01FFZSB24K0QMTG2YBW3A6DYYR");
    expect(decoded.timestamp).toEqual(1644772755000000);
  });

  test("can detect invalid Id", async () => {
    const t = () => {
      id.decode("foo");
    };
    expect(t).toThrow(Error);
    expect(t).toThrow("Invalid Id");
  });
});

describe("the encode() function", () => {
  test("can create Id with valid params", async () => {
    const u = ulid();
    const t = id.encode({ env: "live", ulid: u, timestamp: 1644772755000000 });
    expect(id.isValid(t)).toBeTruthy();
  });

  test("can detect invalid environment", async () => {
    const t = () => {
      const u = ulid();
      const t = id.encode({ env: "foo", ulid: u, timestamp: 1644772755000000 });
    };
    expect(t).toThrow(Error);
    expect(t).toThrow("Invalid environment");
  });

  test("can detect invalid ULID", async () => {
    const t = () => {
      const t = id.encode({
        env: "live",
        ulid: "foo",
        timestamp: 1644772755000000,
      });
    };
    expect(t).toThrow(Error);
    expect(t).toThrow("Invalid ULID");
  });

  test("can detect invalid timestamp too low", async () => {
    const t = () => {
      const u = ulid();
      const t = id.encode({
        env: "live",
        ulid: u,
        timestamp: 1640995200000000 - 1,
      });
    };
    expect(t).toThrow(Error);
    expect(t).toThrow("Invalid timestamp");
  });

  test("can detect invalid timestamp too high", async () => {
    const t = () => {
      const u = ulid();
      const t = id.encode({
        env: "live",
        ulid: u,
        timestamp: 4796668800000000 + 1,
      });
    };
    expect(t).toThrow(Error);
    expect(t).toThrow("Invalid timestamp");
  });
});

describe("the isValid() function", () => {
  test("can validate simple Id", async () => {
    const t = "truestamp_test_01FFZSB24K0QMTG2YBW3A6DYYR_1644772755000000";
    expect(id.isValid(t)).toBeTruthy();
  });

  test("can detect invalid Id", async () => {
    const t = () => {
      id.decode("foo_test_01FFZSB24K0QMTG2YBW3A6DYYR_1644772755000000");
    };
    expect(t).toThrow(Error);
    expect(t).toThrow("Invalid Id");
  });
});
