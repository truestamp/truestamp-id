// Copyright © 2020-2022 Truestamp Inc. All rights reserved.

import { z } from 'zod'
import { hmac as createHmac } from '@noble/hashes/hmac'
import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex } from '@noble/hashes/utils'

const HMAC_LENGTH = 16 // bytes
const ID_PREFIX = 'T'
const ID_SEPARATOR = '_'
const REGEX_ULID = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/
const REGEX_HASH_HEX_20_64 = /^(([a-f0-9]{2}){20,64})$/i
const REGEX_HMAC_KEY = /^(([a-f0-9]{2}){32,64})$/i
const REGEX_HMAC_TRUNC = /^(([A-F0-9]{2}){16})$/i

const REGEX_ID = /^T(1)(0|1)_[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}_[0-9]{16}_[0-9A-F]{32}$/

export const IdV1 = z.object({
  prefix: z.enum(['T']).default(ID_PREFIX),
  version: z.literal(1).default(1), // 1 is the only valid version for now
  test: z.boolean().default(false),
  ulid: z.string().regex(REGEX_ULID),
  timestamp: z.number().int().min(1640995200000000), // DB temporality uses microseconds since epoch for immutable versions starting January 1, 2022 12:00:00 AM
  envelopeHash: z.string().regex(REGEX_HASH_HEX_20_64),
  hmacKey: z.string().regex(REGEX_HMAC_KEY),
  hmac: z.string().regex(REGEX_HMAC_TRUNC),
  id: z.string().regex(REGEX_ID),
})

// The subset of IdV1 needed to parse an Id
export const IdV1ParseArgs = IdV1.pick({ id: true })

export type IdV1ParseArgs = z.infer<typeof IdV1ParseArgs>

/**
 * The subset of IdV1 parsed from a decoded Id
 */
export const IdV1Parsed = IdV1.pick({
  hmac: true,
  prefix: true,
  test: true,
  timestamp: true,
  ulid: true,
  version: true,
})

export type IdV1Parsed = z.infer<typeof IdV1Parsed>

/**
 * The subset of IdV1 needed to encode a new Id
 */
export const IdV1EncodeArgs = IdV1.pick({
  envelopeHash: true,
  hmacKey: true,
  test: true,
  timestamp: true,
  ulid: true,
  version: true,
})

export type IdV1EncodeArgs = z.infer<typeof IdV1EncodeArgs>

/**
 * The subset of IdV1 needed to decode a new Id
 */
export const IdV1DecodeArgs = IdV1.pick({
  envelopeHash: true,
  hmacKey: true,
  id: true,
})

export type IdV1DecodeArgs = z.infer<typeof IdV1DecodeArgs>

/**
 * The subset of IdV1 returned from a decoded Id
 */
export const IdV1Decode = IdV1.pick({
  envelopeHash: true,
  test: true,
  timestamp: true,
  ulid: true,
  version: true,
})

export type IdV1Decode = z.infer<typeof IdV1Decode>

/**
 * The subset of IdV1 returned from a decoded unsafely Id
 */
export const IdV1DecodeUnsafely = IdV1.pick({
  test: true,
  timestamp: true,
  ulid: true,
  version: true,
})

export type IdV1DecodeUnsafely = z.infer<typeof IdV1DecodeUnsafely>

/**
 * Parse the Id components from a string into an Object. Throws an error if the string is not a valid Id.
 * @param args.id - The parse function args with the Id to parse
 * @return - A parsed Truestamp Id.
 */
const parseId = (args: IdV1ParseArgs): IdV1Parsed => {
  try {
    // Validate the args, throws if invalid.
    const validArgs: IdV1ParseArgs = IdV1ParseArgs.parse(args)

    // Split the Id into its components
    const [prefixVerTest, ulid, timestamp, hmac] = validArgs.id.split(ID_SEPARATOR)

    // Split the prefix into its components
    const [prefix, version, test] = prefixVerTest.split('')

    // Validate and return the parsed components, throw if invalid
    return IdV1Parsed.parse({
      prefix,
      version: parseInt(version, 10),
      test: parseInt(test, 10) == 1 ? true : false,
      ulid,
      timestamp: parseInt(timestamp, 10),
      hmac,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Pass ZodErrors through
      throw error
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
  try {
    const validArgs: IdV1EncodeArgs = IdV1EncodeArgs.parse(args)

    // Create the base of the Id, with all components except the HMAC
    const idBase = `${ID_PREFIX}${validArgs.version}${validArgs.test ? 1 : 0}_${validArgs.ulid}_${validArgs.timestamp}`

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
  } catch (error) {
    if (error instanceof z.ZodError) {
      const joinedIssues: string = error.issues
        .map((issue: z.ZodIssue) => {
          return `${issue.code} : [${issue.path.join(', ')}] : ${issue.message}`
        })
        .join('; ')
      throw new Error(`Invalid Id:  ${joinedIssues}`)
    } else if (error instanceof Error) {
      throw new Error(`Invalid Id: ${error.message}`)
    } else {
      throw error
    }
  }
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
    const validArgs: IdV1DecodeArgs = IdV1DecodeArgs.parse(args)

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

    return IdV1Decode.parse({
      version,
      test,
      ulid: ulid,
      timestamp,
      envelopeHash: validArgs.envelopeHash,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const joinedIssues: string = error.issues
        .map((issue: z.ZodIssue) => {
          return `${issue.code} : [${issue.path.join(', ')}] : ${issue.message}`
        })
        .join('; ')
      throw new Error(`Invalid Id:  ${joinedIssues}`)
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
  try {
    const { version, test, ulid, timestamp } = parseId({ id })

    return IdV1DecodeUnsafely.parse({
      version,
      test,
      ulid,
      timestamp,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const joinedIssues: string = error.issues
        .map((issue: z.ZodIssue) => {
          return `${issue.code} : [${issue.path.join(', ')}] : ${issue.message}`
        })
        .join('; ')
      throw new Error(`Invalid Id:  ${joinedIssues}`)
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
    const validArgs: IdV1DecodeArgs = IdV1DecodeArgs.parse(args)

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
