// Copyright © 2021 Truestamp Inc. All Rights Reserved.

// https://github.com/perry-mitchell/ulidx
import { ulid } from "ulidx";

const ULID_REGEX = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/
const ID_REGEX = /^T[0-9]{1}[0-9]{1}[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}_[0-9]{1,12}$/

// -----------------------------------------------------------------------------
// Enums : Do NOT change the order or value of these enums or delete any of them.
// They are append only!
// -----------------------------------------------------------------------------

// See : https://www.typescriptlang.org/docs/handbook/enums.html

export enum Environment {
  PRODUCTION = 1,
  STAGING = 2,
  DEVELOPMENT = 3,
}

// See : https://docs.aws.amazon.com/general/latest/gr/qldb.html
// Ordered by service introduction.
export enum QLDBRegion {
  US_EAST_2 = 1,
  US_EAST_1 = 2,
  US_WEST_2 = 3,
  AP_NORTHEAST_2 = 4,
  AP_SOUTHEAST_1 = 5,
  AP_SOUTHEAST_2 = 6,
  AP_NORTHEAST_1 = 7,
  EU_CENTRAL_1 = 8,
  EU_WEST_1 = 9,
  EU_WEST_2 = 10,
}

export interface Id {
  prefix: string // 'T' for Truestamp
  env: Environment // Enum value representing the environment
  region: QLDBRegion // Enum value representing the QLDB AWS region and availability zone (e.g. us-east-1)
  ulid: string // ULID used as QLDB Document Identifier (26 character Crockford Base32 string)
  ulidTimestamp?: number // Extracted timestamp component of the ULID (Milliseconds since Unix Epoch)
  version: number // QLDB Version Number
}

export const isValid = (id: string): boolean => {
  try {
    decode(id);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Encodes a Truestamp ID into a string.
 * @param id
 * @returns 
 */
const encode = (id: Id): string => {
  if (id.prefix !== "T") {
    throw new Error("Invalid prefix");
  }
  if (id.env < 1 || id.env > 3) {
    throw new Error("Invalid environment");
  }
  if (id.region < 1 || id.region > 10) {
    throw new Error("Invalid region");
  }
  if (!ULID_REGEX.test(id.ulid)) {
    throw new Error("Invalid ULID");
  }
  if (!Number.isInteger(id.version) || id.version < 0 || id.version > 999999999) {
    throw new Error("Invalid version");
  }

  return `${id.prefix}${id.env}${id.region}${id.ulid}_${id.version}`;
}

/**
 * Decodes a Truestamp ID string into an Id type.
 * @param id
 * @returns Id
 */
export const decode = (id: string): Id => {
  if (!ID_REGEX.test(id)) {
    throw new Error("Invalid ID");
  }

  const prefix = id.substr(0, 1);
  if (prefix !== "T") {
    throw new Error("Invalid prefix");
  }

  const env = parseInt(id.substr(1, 1), 10);
  if (env < 1 || env > 3) {
    throw new Error("Invalid environment");
  }

  const region = parseInt(id.substr(2, 1), 10);
  if (region < 1 || region > 10) {
    throw new Error("Invalid region");
  }

  const ulid = id.substr(3, 26);
  if (!ULID_REGEX.test(ulid)) {
    throw new Error("Invalid ULID");
  }

  const sep = id.substr(29, 1); // '_'
  if (sep !== "_") {
    throw new Error("Invalid separator");
  }

  const version = parseInt(id.substr(30, 12), 10);
  if (version < 0 || version > 999999999) {
    throw new Error("Invalid version");
  }

  const parsedId: Id = {
    prefix,
    env,
    region,
    ulid,
    version,
  };

  return parsedId
}

/**
 * Decodes a Truestamp ID string into a JSON Object with the Environment and QLDBRegion Enums expanded.
 * @param id
 * @returns string
 */
export const decodeToJSON = (id: string): string => {
  const dId: Id = decode(id)
  const pId = {
    prefix: dId.prefix,
    env: Environment[dId.env],
    region: QLDBRegion[dId.region],
    ulid: dId.ulid,
    version: dId.version,
  }

  return JSON.stringify(pId)
}

/**
 * Generate a new Truestamp ID string from parameters provided.
 * Defaults to generating a new ID for the Production environment in the US East (N. Virginia) region.
 * @param env Environment (optional)
 * @param region AWS Region (optional)
 * @param newUlid ULID (optional)
 * @param newVersion Version (optional)
 * @returns string
 */
export const generateNewId = (env: Environment, region: QLDBRegion, newUlid: string, newVersion: number): string => {
  const id: Id = {
    prefix: "T",
    env: env ?? Environment.PRODUCTION,
    region: region ?? QLDBRegion.US_EAST_1,
    ulid: newUlid ?? ulid(),
    version: newVersion ?? 0,
  }
  return encode(id)
}
