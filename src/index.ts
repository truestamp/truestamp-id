// Copyright © 2021 Truestamp Inc. All Rights Reserved.

// ID Composition
// [base32prefix][base32String]
//
// base32prefix : 'truestamp'
// base32String :
//   mac : 32 Byte HMAC-SHA-256 of the compressed message payload
//   Zlib Deflate compressed Binary payload
//     Protocol Buffer Binary Data

import { Message, Root } from "protobufjs"
import { zlibSync, unzlibSync } from 'fflate'
import { verify } from 'tweetnacl'
import { hmac } from "fast-sha256"
import { coerceCode, codes, HashCode, HashName } from "multihashes"
import { base32Encode, base32Decode } from '@ctrl/ts-base32'
import { hexToArray, arrayToHex, concatArrays } from 'enc-utils'

import Ajv, { JSONSchemaType } from "ajv"
const ajv = new Ajv() // options can be passed, e.g. {allErrors: true}

const BASE32_PREFIX = "truestamp"

interface IdDataBase {
  timestamp: number
  qldbId: string
  qldbVersion: number
}

// The interface that is used by Protocol Buffers.
// Uses more efficient encodings than the external JSON format (IdData).
interface IdDataInternal extends IdDataBase {
  region: number
  environment: number
  shortHashBytes: Uint8Array
  hashCode: number
}

// The exported IdData interface represents the public
// representation which will be ingested as, or converted to, JSON.
export interface IdData extends IdDataBase {
  region: string
  environment: string
  shortHash: string
  hashName: string
}

const HMAC_LENGTH = 16 // bytes

// For SHA256 the key length should be the internal block size of 64 bytes.
// See : https://pthree.org/2016/07/29/breaking-hmac/
const HMAC_KEY_LENGTH = 64 // bytes

// Generated from truestamp.proto file with `npx pbjs truestamp.proto`.
// DO NOT modify this manually. Modify the .proto file instead and regenerate.
// See : https://github.com/protobufjs/protobuf.js/tree/master/cli
const protoJSON = {
  "nested": {
    "truestamp": {
      "nested": {
        "Id": {
          "fields": {
            "timestamp": {
              "type": "int64",
              "id": 1
            },
            "region": {
              "type": "Region",
              "id": 2
            },
            "environment": {
              "type": "Environment",
              "id": 3
            },
            "shortHashBytes": {
              "type": "bytes",
              "id": 4
            },
            "hashCode": {
              "type": "int32",
              "id": 5
            },
            "qldbId": {
              "type": "string",
              "id": 6
            },
            "qldbVersion": {
              "type": "int32",
              "id": 7
            }
          },
          "nested": {
            "Region": {
              "values": {
                "REGION_UNSPECIFIED": 0,
                "REGION_US_EAST_1": 1
              }
            },
            "Environment": {
              "values": {
                "ENVIRONMENT_UNSPECIFIED": 0,
                "ENVIRONMENT_PRODUCTION": 1,
                "ENVIRONMENT_STAGING": 2,
                "ENVIRONMENT_DEVELOPMENT": 3
              }
            }
          }
        }
      }
    }
  }
}

const schema: JSONSchemaType<IdData> = {
  type: "object",
  properties: {
    timestamp: {
      type: "integer",
      minimum: 0,
      maximum: 2147483647,
    },
    region: { type: "string", enum: ["us-east-1"] },
    environment: {
      type: "string",
      enum: ["development", "staging", "production"],
    },
    shortHash: {
      type: "string",
      minLength: 16,
      maxLength: 16,
      pattern: "^[a-fA-F0-9]+$",
    },
    hashName: {
      type: "string",
      minLength: 3,
      maxLength: 32,
      pattern: "^[a-zA-Z0-9-]+$",
      nullable: true,
    },
    qldbId: {
      type: "string",
      minLength: 22,
      maxLength: 22,
      pattern: "^[a-zA-Z0-9]+$",
    },
    qldbVersion: { type: "integer", minimum: 0, maximum: 999999999 },
  },
  required: [
    "timestamp",
    "region",
    "environment",
    "shortHash",
    "hashName",
    "qldbId",
    "qldbVersion",
  ],
  additionalProperties: false,
}

// validate is a type guard for IdData - type is inferred from schema type
const validate = ajv.compile(schema)

const isValidIdData = (id: IdData): boolean => {
  const valid = validate(id)
  if (!valid) throw new Error(JSON.stringify(validate.errors, null, 2))
  return true
}

const transformIdDataIntoMessage = async (data: IdData): Promise<Message<{}>> => {
  const root = Root.fromJSON(protoJSON)
  const Id = root.lookupType("truestamp.Id")

  let region
  switch (data.region) {
    case "us-east-1":
    default:
      // @ts-ignore
      region = Id['Region'].REGION_US_EAST_1
      break
  }

  let environment
  switch (data.environment) {
    case "development":
      // @ts-ignore
      environment = Id['Environment'].ENVIRONMENT_DEVELOPMENT
      break
    case "staging":
      // @ts-ignore
      environment = Id['Environment'].ENVIRONMENT_STAGING
      break
    case "production":
    default:
      // @ts-ignore
      environment = Id['Environment'].ENVIRONMENT_PRODUCTION
      break
  }

  const internalId = <IdDataInternal>{
    timestamp: data.timestamp,
    region: region,
    environment: environment,
    shortHashBytes: hexToArray(data.shortHash),
    hashCode: coerceCode(data.hashName as HashName),
    qldbId: data.qldbId,
    qldbVersion: data.qldbVersion,
  }

  let message = Id.create(internalId);

  // Verify the Proto message (i.e. when possibly incomplete or invalid)
  // Instead of throwing, it returns the error message as a string, if any.
  const errMsg = Id.verify(message)
  if (errMsg) throw Error(errMsg)

  return message
}

const transformMessageIntoIdData = async (msg: Message<{}>): Promise<IdData> => {
  const root = Root.fromJSON(protoJSON)
  const Id = root.lookupType("truestamp.Id")

  const obj = Id.toObject(msg, {
    enums: String, // enums as string names
    longs: Number, // longs as strings (requires long.js)
    bytes: Array, // bytes as Array
    defaults: true, // includes default values
    arrays: true, // populates empty arrays (repeated fields) even if defaults=false
    objects: true, // populates empty objects (map fields) even if defaults=false
    oneofs: true, // includes virtual oneof fields set to the present field's name
  })

  let region
  switch (obj.region) {
    case "REGION_US_EAST_1":
    default:
      region = "us-east-1"
      break
  }

  let environment
  switch (obj.environment) {
    case "ENVIRONMENT_STAGING":
      environment = "staging"
      break
    case "ENVIRONMENT_DEVELOPMENT":
      environment = "development"
      break
    case "ENVIRONMENT_PRODUCTION":
    default:
      environment = "production"
      break
  }

  const newId = <IdData>{
    timestamp: obj.timestamp,
    region: region,
    environment: environment,
    shortHash: arrayToHex(obj.shortHashBytes),
    hashName: codes[(obj.hashCode as HashCode)],
    qldbId: obj.qldbId,
    qldbVersion: obj.qldbVersion,
  }

  return newId
}

// Verify HMAC-SHA256, truncated to HMAC_LENGTH, over the compressed message
const verifyMac = (id: string, key: Uint8Array) => {
  const compressedBuffer = base32Decode(id.toUpperCase(), "Crockford")

  const mac = compressedBuffer.slice(0, HMAC_LENGTH)
  const compressedBufferWithoutMac = compressedBuffer.slice(
    HMAC_LENGTH
  )

  // Generate a new HMAC for the payload
  const newMac = hmac(
    key,
    new Uint8Array(compressedBufferWithoutMac)
  ).slice(0, HMAC_LENGTH)

  // Do a constant time comparison of the embedded and new HMAC
  if (!verify(new Uint8Array(mac), newMac)) {
    throw new Error("Invalid ID [mac]")
  }

  return true
}

/**
 * Encode an IdData object into an optionally prefixed Base32 (Crockford) encoded string.
 * @param {IdData} data - An IdData object.
 * @param {Uint8Array} key - A 64 byte Uint8Array HMAC-SHA256 key.
 * @param {boolean} prefix - A boolean to indicate whether to return a prefixed ID.
 * @return {Promise<string>} A Promise that resolves to a Base32 (Crockford) encoded string, optionally prefixed with `truestamp`.
 */
export const encodeId = async (data: IdData, key: Uint8Array, prefix: boolean = true) => {
  if (!key) throw new Error("Missing key")
  if (key.length !== HMAC_KEY_LENGTH) throw new Error("Invalid key length")

  isValidIdData(data)

  const root = Root.fromJSON(protoJSON)
  const ProtoId = root.lookupType("truestamp.Id")

  const message = await transformIdDataIntoMessage(data)

  const protoMessage = ProtoId.create(message)
  const encodedProtoMessage = ProtoId.encode(protoMessage).finish()
  const compressedProtoMessage = zlibSync(encodedProtoMessage, { level: 9 })

  const mac = hmac(key, compressedProtoMessage)

  const base32Id = base32Encode(
    concatArrays(mac.slice(0, HMAC_LENGTH), compressedProtoMessage),
    "Crockford"
  )

  verifyMac(base32Id, key)

  if (prefix) {
    return BASE32_PREFIX + base32Id
  } else {
    return base32Id
  }
}

/**
 * Decode an ID into an IdData object
 * @param {string}  id - A Base32 (Crockford) encoded string, optionally prefixed with `truestamp`.
 * @param {Uint8Array} key - A 64 byte Uint8Array HMAC-SHA256 key.
 * @return {Promise<IdData>} A Promise that resolves to the decoded IdData.
 */
export const decodeId = async (id: string, key: Uint8Array): Promise<IdData> => {
  if (!key) throw new Error("Missing key")
  if (key.length !== HMAC_KEY_LENGTH) throw new Error("Invalid key length")

  // Remove the BASE32_PREFIX if present
  const base32Id = id.replace(BASE32_PREFIX, "")

  // Verify the MAC before decoding
  verifyMac(base32Id, key)

  const root = Root.fromJSON(protoJSON)
  const ProtoId = root.lookupType("truestamp.Id")

  const compressedBuffer = base32Decode(base32Id.toUpperCase(), "Crockford")

  const compressedBufferWithoutMac = compressedBuffer.slice(
    HMAC_LENGTH
  )

  const compressUint8ArrayWithoutMac = new Uint8Array(compressedBufferWithoutMac)
  const buffer = unzlibSync(compressUint8ArrayWithoutMac)
  const msg = ProtoId.decode(buffer)
  const data = await transformMessageIntoIdData(msg)

  isValidIdData(data)

  return data
}
