// Copyright © 2021 Truestamp Inc. All Rights Reserved.

// https://github.com/perry-mitchell/ulidx
import { ULID, ulid as ulidx } from "ulidx";

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

export type ID = string;

interface BaseId {
  prefix: string // 'T' for Truestamp
  ulid: ULID // ULID is used as QLDB Document Identifier (26 character Crockford Base32 string)
  version: number // QLDB Version Number
}

export interface IdEnum extends BaseId {
  env: Environment // Enum value representing the environment
  region: Region // Enum value representing the QLDB AWS region and availability zone (e.g. us-east-1)
}

export interface IdString extends BaseId {
  env: string
  region: string
}

export interface IdGenerateArgs {
  ulid?: ULID
  version?: number
  env?: string
  region?: string
}

/**
 * Generate a new Truestamp ID.
 * With no args, defaults to generating a new ID, with a new ULID, version '0',
 * for the Production environment, and in the AWS 'us-east-1' region.
 *
 * @param {IdGenerateArgs} [id] - A collection of parameters for creating a new ID.
 * @return {ID} - A new Truestamp ID string.
 */
export const generate = (id: IdGenerateArgs = {}): ID => {
  const { ulid = ulidx(), version = 0, env = 'production', region = 'us-east-1' } = id;

  const newEnv = env ? Environment.parse(env as any) : Environment.production;
  if (!newEnv) {
    throw new Error("Invalid environment");
  }

  const newRegion = region ? Region.parse(region as any) : Region['us-east-1'];
  if (!newRegion) {
    throw new Error("Invalid region");
  }

  const newUlid: ULID = ulid ? ulid : ulidx();

  const newVersion: number = version ? version : 0;

  const idToEncode: IdEnum = {
    prefix: "T",
    env: newEnv,
    region: newRegion,
    ulid: newUlid,
    version: newVersion,
  }

  return encode(idToEncode)
}

/**
 * Encodes a Truestamp Id Type into a string.
 * @param {IdEnum | IdString} id - A Truestamp Id Type.
 * @return {ID} - A Truestamp Id string.
 */
export const encode = (id: IdEnum | IdString): ID => {
  if (!id) {
    throw new Error('Id is required');
  }

  if (id.prefix !== "T") {
    throw new Error("Invalid prefix");
  }

  if (!ULID_REGEX.test(id.ulid)) {
    throw new Error("Invalid ULID");
  }

  if (!Number.isInteger(id.version) || id.version < 0 || id.version > 999999999) {
    throw new Error("Invalid version");
  }

  let parsedEnv: Environment;
  if (typeof id.env === "string") {
    parsedEnv = Environment.parse(id.env as any)
    if (!parsedEnv) {
      throw new Error("Invalid environment");
    }
  } else {
    // Enum value
    parsedEnv = id.env;
  }

  let parsedRegion: Region;
  if (typeof id.region === "string") {
    parsedRegion = Region.parse(id.region as any)
    if (!parsedRegion) {
      throw new Error("Invalid region");
    }
  } else {
    // Enum value
    parsedRegion = id.region;
  }

  return `${id.prefix}${id.env}${id.region}${id.ulid}_${id.version}`;
}

/**
 * Decodes a Truestamp ID string into an Id type.
 * @param {ID} id - A Truestamp ID string.
 * @return {IdString} - A decoded Id type with Enums as strings.
 */
export const decode = (id: ID): IdString => {
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

  const parsedId: IdString = {
    prefix,
    env: Environment[env],
    region: Region[region],
    ulid,
    version,
  };

  return parsedId
}

/**
 * Validates a Truestamp ID string. Does not indicate if the ID exists, only that it's structure is valid.
 * @param {ID} id - A Truestamp ID string.
 * @return {boolean} - True if the ID structure is valid, false otherwise.
 */
export const isValid = (id: ID): boolean => {
  try {
    decode(id);
    return true;
  } catch (e) {
    return false;
  }
}
