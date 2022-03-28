// Copyright © 2021-2022 Truestamp Inc. All Rights Reserved.

import { hmac as createHmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import {
  boolean,
  create,
  defaulted,
  min,
  object,
  pattern,
  pick,
  size,
  string,
  integer,
  Infer,
  StructError,
} from "superstruct";

const ID_PREFIX = "T";
const ID_SEPARATOR = "_";
const REGEX_ULID = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/;
const REGEX_HASH_HEX_20_64 = /^(([a-f0-9]{2}){20,64})$/i;
const REGEX_HMAC_KEY = /^(([a-f0-9]{2}){32,64})$/i;
const REGEX_HMAC_TRUNC = /^(([A-F0-9]{2}){16})$/i;

const ID_REGEX =
  /^T(1)(0|1)_[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}_[0-9]{16}_[0-9A-F]{32}$/;

const IdV1Struct = object({
  version: size(integer(), 1, 1), // 1 is the only valid version for now
  test: defaulted(boolean(), false),
  ulid: pattern(string(), REGEX_ULID),
  timestamp: min(integer(), 1640995200000000), // DB temporality uses microseconds since epoch for immutable versions starting January 1, 2022 12:00:00 AM
  envelopeHash: pattern(string(), REGEX_HASH_HEX_20_64),
  hmacKey: pattern(string(), REGEX_HMAC_KEY),
  hmac: pattern(string(), REGEX_HMAC_TRUNC),
});

// The subset of IdV1Struct needed to encode a new Id
const IdV1EncodeStruct = pick(IdV1Struct, [
  "version",
  "test",
  "ulid",
  "timestamp",
  "envelopeHash",
  "hmacKey",
]);

export type IdV1Encode = Infer<typeof IdV1EncodeStruct>;

// The subset of IdV1Struct returned from a decoded Id
const IdV1DecodeStruct = pick(IdV1Struct, [
  "version",
  "test",
  "ulid",
  "timestamp",
  "envelopeHash",
]);

export type IdV1Decode = Infer<typeof IdV1DecodeStruct>;

const IdV1DecodeUnsafelyStruct = pick(IdV1Struct, [
  "version",
  "test",
  "ulid",
  "timestamp",
]);

export type IdV1DecodeUnsafely = Infer<typeof IdV1DecodeUnsafelyStruct>;

/**
 * Parse the Id components from a string into an Object
 * @param {string} id - The string Id to parse
 * @return {Object} - A parsed Truestamp Id.
 */
const parseId = (id: string): Record<string, string | number | boolean> => {
  if (!ID_REGEX.test(id)) {
    throw new Error(`Invalid Id: ${id}`);
  }

  // Split the Id into its components
  const [prefixVerTest, ulid, timestamp, hmac] = id.split(ID_SEPARATOR);

  // Split the prefix into its components
  const [prefix, version, test] = prefixVerTest.split("");

  return {
    prefix,
    version: parseInt(version, 10),
    test: parseInt(test, 10) == 1 ? true : false,
    ulid,
    timestamp: parseInt(timestamp, 10),
    hmac,
  };
};

/**
 * Encodes new Id parameters into a string Truestamp Id. Throws an error if any of the
 * parameters are invalid.
 * @param {IdV1Encode} [id] - New Id parameters.
 * @return {string} - A Truestamp Id string.
 */
export const encode = (id: IdV1Encode): string => {
  const validId = create(id, IdV1EncodeStruct);

  // Create the base of the Id, with all components except the hmac
  const idBase = `${ID_PREFIX}${validId.version}${validId.test ? 1 : 0}_${validId.ulid
    }_${validId.timestamp}`;

  // Construct the message to be passed to the hmac function.
  // It consists of the base of the Id, followed by the envelopeHash.
  // This commits all of the Id's components to the hmac in addition to
  // the hash of the envelope it points to.
  const hmacMessage = `${idBase}${ID_SEPARATOR}${validId.envelopeHash}`;

  // Compute the hmac of the message
  const idHmac = createHmac(sha256, validId.hmacKey, hmacMessage);

  // Concatenate the base of the Id with the a truncated 16 Byte (32 hex) HMAC-SHA256 hash.
  // Truncating the HMAC is safe for this purpose and keeps the length of the Id reasonable.
  // See: https://datatracker.ietf.org/doc/html/rfc2104#section-5
  const proposedId = `${idBase}${ID_SEPARATOR}${bytesToHex(idHmac)
    .slice(0, 32)
    .toUpperCase()}`;

  return proposedId;
};

/**
 * Decodes a Truestamp Id string into an Id object with HMAC-SHA256 verification. Throws an error if the ID is invalid.
 * @param {Object} args - function args.
 * @param {string} args.id - A Truestamp Id string.
 * @param {string} args.envelopeHash - The top-level hash in the Item Envelope that this Id commits to with an HMAC-SHA256.
 * @param {string} args.hmacKey - The secret key used to verify the HMAC-SHA256.
 * @return {IdV1Decode} - A decoded Id object.
 */
export const decode = ({
  id,
  envelopeHash,
  hmacKey,
}: {
  id: string;
  envelopeHash: string;
  hmacKey: string;
}): IdV1Decode => {
  const { prefix, version, test, ulid, timestamp, hmac } = parseId(id);

  // Recreate the hmac of the message
  const idBase = `${prefix}${version}${test ? 1 : 0}_${ulid}_${timestamp}`;
  const hmacMessage = `${idBase}${ID_SEPARATOR}${envelopeHash}`;
  const idHmac = createHmac(sha256, hmacKey, hmacMessage);

  // Truncated HMAC : 16 bytes (32 hex)
  const truncatedHmac = bytesToHex(idHmac).slice(0, 32).toUpperCase();

  if (truncatedHmac !== hmac) {
    throw new Error(`Invalid HMAC for Id: ${id}`);
  }

  try {
    const createdId = create(
      {
        version,
        test,
        ulid: ulid,
        timestamp,
        envelopeHash,
      },
      IdV1DecodeStruct
    );

    return createdId;
  } catch (error) {
    if (error instanceof StructError) {
      throw new Error(`Invalid Id structure: ${error.message}`);
    } else if (error instanceof Error) {
      throw new Error(`Invalid Id: ${error.message}`);
    } else {
      throw error;
    }
  }
};

/**
 * Validates and decodes a Truestamp Id string unsafely with NO HMAC verification. Not recommended for normal use. Indicates only that the Id has a valid structure. Throws an 'Error' if the Id has an invalid structure.
 * @param {Object} args - function args.
 * @param {string} args.id - A Truestamp Id string.
 * @return {IdV1DecodeUnsafely} - Id Object with no HMAC verification.
 */
export const decodeUnsafely = ({ id }: { id: string }): IdV1DecodeUnsafely => {
  const { version, test, ulid, timestamp } = parseId(id);

  try {
    const createdId = create(
      {
        version,
        test,
        ulid,
        timestamp,
      },
      IdV1DecodeUnsafelyStruct
    );

    return createdId;
  } catch (error) {
    if (error instanceof StructError) {
      throw new Error(`Invalid Id structure: ${error.message}`);
    } else if (error instanceof Error) {
      throw new Error(`Invalid Id: ${error.message}`);
    } else {
      throw error;
    }
  }
};

/**
 * Validates a Truestamp Id string with HMAC verification. Does not indicate if the content pointed to by the Id exists, only that it has a valid structure and HMAC. Returns false if the Id is invalid (does not throw).
 * @param {Object} args - function args.
 * @param {string} args.id - A Truestamp Id string.
 * @param {string} args.envelopeHash - The top-level hash in the Item Envelope that this Id commits to with an HMAC-SHA256.
 * @param {string} args.hmacKey - A Hex key used to verify the HMAC-SHA256.
 * @return {boolean} - is the Truestamp Id structure valid?
 */
export const isValid = ({
  id,
  envelopeHash,
  hmacKey,
}: {
  id: string;
  envelopeHash: string;
  hmacKey: string;
}): boolean => {
  try {
    decode({ id, envelopeHash, hmacKey });
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validates a Truestamp Id string unsafely with NO HMAC verification. Not recommended for normal use. Indicates only that the Id has a valid structure. Returns false if the Id is invalid (does not throw).
 * @param {Object} args - function args.
 * @param {string} args.id - A Truestamp Id string.
 * @return {boolean} - is the Truestamp Id structure valid?
 */
export const isValidUnsafely = ({ id }: { id: string }): boolean => {
  try {
    decodeUnsafely({ id });
    return true;
  } catch (error) {
    return false;
  }
};
