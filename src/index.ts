// Copyright © 2020-2022 Truestamp Inc. All rights reserved.

import { hmac as createHmac } from '@noble/hashes/hmac'
import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex } from '@noble/hashes/utils'
import {
  assert,
  boolean,
  create,
  defaulted,
  enums,
  min,
  object,
  pattern,
  pick,
  size,
  string,
  integer,
  Infer,
  StructError,
} from 'superstruct'

const HMAC_LENGTH = 16 // bytes
const ID_PREFIX = 'T'
const ID_SEPARATOR = '_'
const REGEX_ULID = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/
const REGEX_HASH_HEX_20_64 = /^(([a-f0-9]{2}){20,64})$/i
const REGEX_HMAC_KEY = /^(([a-f0-9]{2}){32,64})$/i
const REGEX_HMAC_TRUNC = /^(([A-F0-9]{2}){16})$/i

const REGEX_ID =
  /^T(1)(0|1)_[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}_[0-9]{16}_[0-9A-F]{32}$/

export const IdV1Struct = object({
  prefix: defaulted(enums(['T']), ID_PREFIX),
  version: size(integer(), 1, 1), // 1 is the only valid version for now
  test: defaulted(boolean(), false),
  ulid: pattern(string(), REGEX_ULID),
  timestamp: min(integer(), 1640995200000000), // DB temporality uses microseconds since epoch for immutable versions starting January 1, 2022 12:00:00 AM
  envelopeHash: pattern(string(), REGEX_HASH_HEX_20_64),
  hmacKey: pattern(string(), REGEX_HMAC_KEY),
  hmac: pattern(string(), REGEX_HMAC_TRUNC),
  id: pattern(string(), REGEX_ID),
})

// The subset of IdV1Struct needed to parse an Id
export const IdV1ParseArgsStruct = pick(IdV1Struct, ['id'])

export type IdV1ParseArgs = Infer<typeof IdV1ParseArgsStruct>

/**
 * The subset of IdV1Struct parsed from a decoded Id
 */
export const IdV1ParsedStruct = pick(IdV1Struct, [
  'prefix',
  'version',
  'test',
  'ulid',
  'timestamp',
  'hmac',
])

export type IdV1Parsed = Infer<typeof IdV1ParsedStruct>

/**
 * The subset of IdV1Struct needed to encode a new Id
 */
export const IdV1EncodeArgsStruct = pick(IdV1Struct, [
  'version',
  'test',
  'ulid',
  'timestamp',
  'envelopeHash',
  'hmacKey',
])

export type IdV1EncodeArgs = Infer<typeof IdV1EncodeArgsStruct>

/**
 * The subset of IdV1Struct needed to decode a new Id
 */
export const IdV1DecodeArgsStruct = pick(IdV1Struct, [
  'id',
  'envelopeHash',
  'hmacKey',
])

export type IdV1DecodeArgs = Infer<typeof IdV1DecodeArgsStruct>

/**
 * The subset of IdV1Struct returned from a decoded Id
 */
export const IdV1DecodeStruct = pick(IdV1Struct, [
  'version',
  'test',
  'ulid',
  'timestamp',
  'envelopeHash',
])

export type IdV1Decode = Infer<typeof IdV1DecodeStruct>

/**
 * The subset of IdV1Struct returned from a decoded unsafely Id
 */
export const IdV1DecodeUnsafelyStruct = pick(IdV1Struct, [
  'version',
  'test',
  'ulid',
  'timestamp',
])

export type IdV1DecodeUnsafely = Infer<typeof IdV1DecodeUnsafelyStruct>

/**
 * Parse the Id components from a string into an Object. Throws an error if the string is not a valid Id.
 * @param args.id - The parse function args with the Id to parse
 * @return - A parsed Truestamp Id.
 */
const parseId = (args: IdV1ParseArgs): IdV1Parsed => {
  try {
    // Validate the args, throws if invalid.
    const validArgs = create(args, IdV1ParseArgsStruct)

    // Split the Id into its components
    const [prefixVerTest, ulid, timestamp, hmac] =
      validArgs.id.split(ID_SEPARATOR)

    // Split the prefix into its components
    const [prefix, version, test] = prefixVerTest.split('')

    const parsed: IdV1Parsed = {
      prefix,
      version: parseInt(version, 10),
      test: parseInt(test, 10) == 1 ? true : false,
      ulid,
      timestamp: parseInt(timestamp, 10),
      hmac,
    }

    // Validate the parsed components, throw if invalid
    assert(parsed, IdV1ParsedStruct)
    return parsed
  } catch (error) {
    if (error instanceof StructError) {
      throw new Error(`Invalid Id structure: ${error.message}`)
    } else if (error instanceof Error) {
      throw new Error(`Invalid Id: ${error.message}`)
    } else {
      throw error
    }
  }
}

/**
 * Encodes args into a string Truestamp Id. Throws an error if any of the
 * args are invalid.
 *
 * @param args.version - The Id version
 * @param args.test - Whether the Id is a test Id
 * @param args.ulid - The ULID of the Id
 * @param args.timestamp - The timestamp of the Id
 * @param args.envelopeHash - The hash of the envelope
 * @param args.hmacKey - The HMAC key
 * @return - A Truestamp Id string.
 */
export const encode = (args: IdV1EncodeArgs): string => {
  const validArgs = create(args, IdV1EncodeArgsStruct)

  // Create the base of the Id, with all components except the HMAC
  const idBase = `${ID_PREFIX}${validArgs.version}${validArgs.test ? 1 : 0}_${
    validArgs.ulid
  }_${validArgs.timestamp}`

  // Construct the message to be passed to the HMAC function.
  // It consists of the base of the Id, followed by the envelopeHash.
  // This commits all of the Id's components to the HMAC in addition to
  // the hash of the envelope it points to.
  const hmacMessage = `${idBase}${ID_SEPARATOR}${validArgs.envelopeHash}`

  // Compute the HMAC of the message
  // Truncating the HMAC is safe and keeps the length of the Id reasonable.
  // See: https://datatracker.ietf.org/doc/html/rfc2104#section-5
  const idHmac = createHmac(sha256, validArgs.hmacKey, hmacMessage)
  const idHmacSliced = bytesToHex(idHmac.slice(0, HMAC_LENGTH))
  const idHmacSlicedUpper = idHmacSliced.toUpperCase()

  // Concatenate the base of the Id with the new truncated HMAC-SHA256.
  return `${idBase}${ID_SEPARATOR}${idHmacSlicedUpper}`
}

/**
 * Decodes a Truestamp Id string into an Id object with HMAC-SHA256 verification.
 * Throws an error if the ID is invalid.
 *
 * @param args.id - A Truestamp Id string.
 * @param args.envelopeHash - The top-level hash in the Item Envelope that this Id commits to with an HMAC-SHA256.
 * @param args.hmacKey - The secret key used to verify the HMAC-SHA256.
 * @return - A decoded Id object.
 */
export const decode = (args: IdV1DecodeArgs): IdV1Decode => {
  try {
    const validArgs = create(args, IdV1DecodeArgsStruct)

    const { prefix, version, test, ulid, timestamp, hmac } = parseId({
      id: validArgs.id,
    })

    // Recreate the hmac of the message
    const idBase = `${prefix}${version}${test ? 1 : 0}_${ulid}_${timestamp}`
    const hmacMessage = `${idBase}${ID_SEPARATOR}${validArgs.envelopeHash}`
    const idHmac = createHmac(sha256, validArgs.hmacKey, hmacMessage)

    // Truncated HMAC : 16 bytes (32 hex)
    const truncatedHmac = bytesToHex(idHmac).slice(0, 32).toUpperCase()

    if (truncatedHmac !== hmac) {
      throw new Error(`Invalid HMAC for Id: ${validArgs.id}`)
    }

    const createdId = create(
      {
        version,
        test,
        ulid: ulid,
        timestamp,
        envelopeHash: validArgs.envelopeHash,
      },
      IdV1DecodeStruct,
    )

    return createdId
  } catch (error) {
    if (error instanceof StructError) {
      throw new Error(`Invalid Id structure: ${error.message}`)
    } else if (error instanceof Error) {
      throw new Error(`Invalid Id: ${error.message}`)
    } else {
      throw error
    }
  }
}

/**
 * Validates and decodes a Truestamp Id string unsafely with NO HMAC verification. Not recommended
 * for normal use. Indicates only that the Id has a valid structure. Throws an 'Error' if the Id
 * has an invalid structure.
 *
 * @param args.id - A Truestamp Id string.
 * @return - Id Object with no HMAC verification.
 */
export const decodeUnsafely = ({ id }: { id: string }): IdV1DecodeUnsafely => {
  const { version, test, ulid, timestamp } = parseId({ id })

  try {
    const createdId = create(
      {
        version,
        test,
        ulid,
        timestamp,
      },
      IdV1DecodeUnsafelyStruct,
    )

    return createdId
  } catch (error) {
    if (error instanceof StructError) {
      throw new Error(`Invalid Id structure: ${error.message}`)
    } else if (error instanceof Error) {
      throw new Error(`Invalid Id: ${error.message}`)
    } else {
      throw error
    }
  }
}

/**
 * Validates a Truestamp Id string with HMAC verification. Does not indicate if the content
 * pointed to by the Id exists, only that it has a valid structure and HMAC. Returns false
 * if the Id is invalid (does not throw).
 *
 * @param args.id - A Truestamp Id string.
 * @param args.envelopeHash - The top-level hash in the Item Envelope that this Id commits to with an HMAC-SHA256.
 * @param args.hmacKey - A Hex key used to verify the HMAC-SHA256.
 * @return - Is the Truestamp Id structure valid?
 */
export const isValid = (args: IdV1DecodeArgs): boolean => {
  try {
    // Validate the args, throws if invalid.
    const validArgs = create(args, IdV1DecodeArgsStruct)
    decode({
      id: validArgs.id,
      envelopeHash: validArgs.envelopeHash,
      hmacKey: validArgs.hmacKey,
    })
    return true
  } catch (error) {
    return false
  }
}

/**
 * Validates a Truestamp Id string unsafely with NO HMAC verification. Not recommended for
 * normal use. Indicates only that the Id has a valid structure. Returns false if the Id
 * is invalid (does not throw).
 * @param args.id - A Truestamp Id string.
 * @return - Is the Truestamp Id structure valid?
 */
export const isValidUnsafely = ({ id }: { id: string }): boolean => {
  try {
    decodeUnsafely({ id })
    return true
  } catch (error) {
    return false
  }
}
