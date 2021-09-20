// Copyright © 2021 Truestamp Inc. All Rights Reserved.

// https://github.com/perry-mitchell/ulidx
import { ulid as ulidx } from "ulidx";

const ULID_REGEX = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/
const ID_REGEX = /^T[0-9]{1}[0-9]{1}[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}_[0-9]{1,12}$/

// -----------------------------------------------------------------------------
// Enums : Do NOT change the order or value of these enums or delete any of them.
// They are append only!
// -----------------------------------------------------------------------------

// See : https://www.typescriptlang.org/docs/handbook/enums.html

export enum Environment {
  production = 1,
  staging = 2,
  development = 3,
}

// See : https://stackoverflow.com/a/69130789/3902629
// Get the keys 'production' | 'staging' | 'development' (but not 'parse')
type EnvironmentKey = keyof Omit<typeof Environment, 'parse'>;

export namespace Environment {
  export function parse(environmentName: EnvironmentKey) {
    return Environment[environmentName];
  }
}

// See : https://docs.aws.amazon.com/general/latest/gr/qldb.html
// QLDB Regions, ordered by service introduction.
export enum Region {
  'us-east-2' = 1,
  'us-east-1' = 2,
  'us-west-2' = 3,
  'ap-northeast-2' = 4,
  'ap-southeast-1' = 5,
  'ap-southeast-2' = 6,
  'ap-northeast-1' = 7,
  'eu-central-1' = 8,
  'eu-west-1' = 9,
  'eu-west-2' = 10,
}

type RegionKey = keyof Omit<typeof Region, 'parse'>;

export namespace Region {
  export function parse(regionName: RegionKey) {
    return Region[regionName];
  }
}

export interface Id {
  prefix: string // 'T' for Truestamp
  env: Environment // Enum value representing the environment
  region: Region // Enum value representing the QLDB AWS region and availability zone (e.g. us-east-1)
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
 * Encodes a Truestamp Id Type into a string.
 * @param id
 * @returns string
 */
export const encode = (id: Id): string => {
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
    region: Region[dId.region],
    ulid: dId.ulid,
    version: dId.version,
  }

  return JSON.stringify(pId)
}

/**
 * Generate a new Truestamp ID string from parameters provided.
 * Defaults to generating a new ID for the Production environment in the US East (N. Virginia) region.
 * 
 * @param {string} [ulid] - A new ULID, defaults to newly generated ULID.
 * @param {number} [version=0] - A version number.
 * @param {string} [environment='production'] - An environment ['production', 'staging', 'development']
 * @param {string} [region='us-east-1'] - An AWS Region (QLDB)
 * @return {string} - A new Truestamp ID string.
 */
export const generateNewId = (ulid: string, version: number, environment: string, region: string): string => {
  const env = environment ? Environment.parse(environment as any) : Environment.production;
  if (!env) {
    throw new Error("Invalid environment");
  }

  const reg = region ? Region.parse(region as any) : Region['us-east-1'];
  if (!reg) {
    throw new Error("Invalid region");
  }

  const id: Id = {
    prefix: "T",
    env: env,
    region: reg,
    ulid: ulid ?? ulidx(),
    version: version ?? 0,
  }
  return encode(id)
}
