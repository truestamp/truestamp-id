// Copyright © 2021-2022 Truestamp Inc. All Rights Reserved.

const { ulid } = require("ulidx");
import { encode, decode, decodeUnsafely, isValid, isValidUnsafely } from '../src/index'

// Samples
const HMAC_KEY =
  "deadc44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const ENVELOPE_HASH =
  "beefc44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

describe("the encode() function", () => {
  test("can create Id with valid params", async () => {
    const t = encode({
      version: 1,
      test: false,
      ulid: ulid(),
      timestamp: 1644772755000000,
      envelopeHash: ENVELOPE_HASH,
      hmacKey: HMAC_KEY,
    });
    expect(
      isValid({ id: t, envelopeHash: ENVELOPE_HASH, hmacKey: HMAC_KEY })
    ).toBeTruthy();
  });

  test("can detect invalid version", async () => {
    const t = () => {
      const t = encode({
        version: 0,
        test: false,
        ulid: ulid(),
        timestamp: 1644772755000000,
        envelopeHash: ENVELOPE_HASH,
        hmacKey: HMAC_KEY,
      });
    };
    expect(t).toThrow(Error);
    expect(t).toThrow(
      "At path: version -- Expected a integer of `1` but received `0`"
    );
  });

  test("can detect invalid ULID", async () => {
    const t = () => {
      const t = encode({
        version: 1,
        test: false,
        ulid: "foo",
        timestamp: 1644772755000000,
        envelopeHash: ENVELOPE_HASH,
        hmacKey: HMAC_KEY,
      });
    };
    expect(t).toThrow(Error);
    expect(t).toThrow(
      'At path: ulid -- Expected a string matching `/^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/` but received "foo"'
    );
  });

  test("can detect invalid timestamp too low", async () => {
    const t = () => {
      const t = encode({
        version: 1,
        test: false,
        ulid: ulid(),
        timestamp: 1640995200000000 - 1,
        envelopeHash: ENVELOPE_HASH,
        hmacKey: HMAC_KEY,
      });
    };
    expect(t).toThrow(Error);
    expect(t).toThrow(
      "At path: timestamp -- Expected a integer greater than or equal to 1640995200000000 but received `1640995199999999`"
    );
  });

  test("can detect invalid envelopeHash", async () => {
    const t = () => {
      const t = encode({
        version: 1,
        test: false,
        ulid: ulid(),
        timestamp: 1640995200000000,
        envelopeHash: "foo",
        hmacKey: HMAC_KEY,
      });
    };
    expect(t).toThrow(Error);
    expect(t).toThrow(
      'At path: envelopeHash -- Expected a string matching `/^(([a-f0-9]{2}){20,64})$/` but received "foo"'
    );
  });

  test("can detect invalid envelopeHash", async () => {
    const t = () => {
      const t = encode({
        version: 1,
        test: false,
        ulid: ulid(),
        timestamp: 1640995200000000,
        envelopeHash: ENVELOPE_HASH,
        hmacKey: "foo",
      });
    };
    expect(t).toThrow(Error);
    expect(t).toThrow(
      'At path: hmacKey -- Expected a string matching `/^(([a-f0-9]{2}){32,64})$/` but received "foo"'
    );
  });
});

describe("the decode() function", () => {
  test("can decode simple Id", async () => {
    const t =
      "T10_01FZ93KY67VYMFTVXTJ5BKWGT7_1640995200000000_63F9FA40EEC63EC865ABAB31A9ED1638";

    const decoded = decode({
      id: t,
      envelopeHash: ENVELOPE_HASH,
      hmacKey: HMAC_KEY,
    });

    expect(decoded.version).toEqual(1);
    expect(decoded.test).toEqual(false);
    expect(decoded.ulid).toEqual("01FZ93KY67VYMFTVXTJ5BKWGT7");
    expect(decoded.timestamp).toEqual(1640995200000000);
    expect(decoded.envelopeHash).toEqual(ENVELOPE_HASH);
  });

  test("can detect invalid Id", async () => {
    const t = () => {
      decode({
        id: "foo",
        envelopeHash: ENVELOPE_HASH,
        hmacKey: HMAC_KEY
      });
    };
    expect(t).toThrow(Error);
    expect(t).toThrow("Invalid Id");
  });

  test("can detect modified hmac", async () => {
    const t = () => {
      decode({
        id: "T10_01FZ93KY67VYMFTVXTJ5BKWGT7_1640995200000000_63F9FA40EEC63EC865ABAB31A9ED1639", // changed last char from '8' to '9'
        envelopeHash: ENVELOPE_HASH,
        hmacKey: HMAC_KEY
      });
    };
    expect(t).toThrow(Error);
    expect(t).toThrow("Invalid HMAC for Id: T10_01FZ93KY67VYMFTVXTJ5BKWGT7_1640995200000000_63F9FA40EEC63EC865ABAB31A9ED1639");
  });

});

describe("the decodeUnsafely() function", () => {
  test("can decode simple Id", async () => {
    const t =
      "T10_01FZ93KY67VYMFTVXTJ5BKWGT7_1640995200000000_63F9FA40EEC63EC865ABAB31A9ED1638";

    const decoded = decodeUnsafely({ id: t });

    expect(decoded.version).toEqual(1);
    expect(decoded.test).toEqual(false);
    expect(decoded.ulid).toEqual("01FZ93KY67VYMFTVXTJ5BKWGT7");
    expect(decoded.timestamp).toEqual(1640995200000000);
  });

  test("can detect invalid Id", async () => {
    const t = () => {
      decodeUnsafely({
        id: "foo"
      });
    };
    expect(t).toThrow(Error);
    expect(t).toThrow("Invalid Id");
  });
});

describe("the isValid() function", () => {
  test("can validate simple Id", async () => {
    expect(
      isValid({
        id: "T10_01FZ93KY67VYMFTVXTJ5BKWGT7_1640995200000000_63F9FA40EEC63EC865ABAB31A9ED1638",
        envelopeHash: ENVELOPE_HASH,
        hmacKey: HMAC_KEY,
      })
    ).toBeTruthy();
  });

  test("can detect invalid Id", async () => {
    expect(
      isValid({
        id: "Z10_01FZ93KY67VYMFTVXTJ5BKWGT7_1640995200000000_63F9FA40EEC63EC865ABAB31A9ED1638",
        envelopeHash: ENVELOPE_HASH,
        hmacKey: HMAC_KEY,
      })
    ).toBeFalsy();
  });
});

describe("the isValidUnsafely() function", () => {
  test("can validate simple Id", async () => {
    expect(
      isValidUnsafely({
        id: "T10_01FZ93KY67VYMFTVXTJ5BKWGT7_1640995200000000_63F9FA40EEC63EC865ABAB31A9ED1638",
      })
    ).toBeTruthy();
  });

  test("can detect invalid Id", async () => {
    expect(
      isValidUnsafely({
        id: "Z10_01FZ93KY67VYMFTVXTJ5BKWGT7_1640995200000000_63F9FA40EEC63EC865ABAB31A9ED1638",
      })
    ).toBeFalsy();
  });
});
