// Copyright © 2021-2022 Truestamp Inc. All Rights Reserved.

const ID_PREFIX = "t";
const ID_SEPARATOR = "_";
const ULID_REGEX = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/;
const ID_REGEX =
  /^t_(test|live)_[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}_[0-9]{16}$/;
const ENVIRONMENTS = ["live", "test"];

export type Id = {
  env: string;
  ulid: string;
  timestamp: number;
};

const normalizePrefix = (prefix?: string): string => {
  if (!prefix) {
    return ID_PREFIX;
  }

  if (prefix.trim() !== prefix || prefix.trim() === "") {
    throw new Error(`Invalid prefix: ${prefix}`);
  }

  const prefixLower = prefix.toLowerCase();
  if (prefixLower !== ID_PREFIX) {
    throw new Error(`Invalid prefix: ${prefix}`);
  }
  return prefixLower;
};

const normalizeEnvironment = (environment?: string): string => {
  if (!environment) {
    return "live";
  }

  if (
    !environment ||
    environment.trim() !== environment ||
    environment.trim() === ""
  ) {
    throw new Error(`Invalid environment: ${environment}`);
  }

  let envLower = environment.toLowerCase();
  if (!ENVIRONMENTS.includes(envLower)) {
    throw new Error(`Invalid environment: ${environment}`);
  }

  return envLower;
};

const normalizeULID = (ulid: string): string => {
  if (!ulid || ulid.trim() !== ulid || ulid.trim() === "") {
    throw new Error(`Invalid ULID: ${ulid}`);
  }

  const ulidUpper = ulid.toUpperCase();
  if (!ULID_REGEX.test(ulidUpper)) {
    throw new Error(`Invalid ULID: ${ulid}`);
  }
  return ulidUpper;
};

// Temporality feature uses microseconds since epoch to represent immutable versions
const normalizeTimestamp = (ts?: string | number): number => {
  if (!ts) {
    return 0;
  }

  const tsInt = parseInt(ts.toString(), 10);
  if (
    !Number.isInteger(tsInt) ||
    tsInt < 1640995200000000 || // January 1, 2022 12:00:00 AM in microseconds since the Unix epoch
    tsInt > 4796668800000000 // January 1, 2122 12:00:00 AM in microseconds since the Unix epoch
  ) {
    throw new Error(`Invalid timestamp: ${ts}`);
  }
  return tsInt;
};

/**
 * Encodes new Id parameters into a string Truestamp Id. Throws an error if any of the parameters are invalid.
 * @param {IdEncodeArgs} [id] - A parameter object for creating a new Id.
 * @return {string} - A Truestamp Id string.
 */
export const encode = (id: Id): string => {
  const { env, ulid, timestamp } = id;

  const normalPrefix = normalizePrefix();
  const normalEnvironment = normalizeEnvironment(env);
  const normalULID = normalizeULID(ulid);
  const normalTimestamp = normalizeTimestamp(timestamp);

  return [normalPrefix, normalEnvironment, normalULID, normalTimestamp].join(
    ID_SEPARATOR
  );
};

/**
 * Decodes a Truestamp Id string into an Id object. Throws an error if the ID is invalid.
 * @param {string} id - A Truestamp Id string.
 * @return {DecodedId} - A decoded Id object.
 */
export const decode = (id: string): Id => {
  if (!ID_REGEX.test(id)) {
    throw new Error(`Invalid Id: ${id}`);
  }

  const [_prefix, env, ulid, timestamp] = id.split(ID_SEPARATOR);

  const normalEnvironment = normalizeEnvironment(env);
  const normalULID = normalizeULID(ulid);
  const normalTimestamp = normalizeTimestamp(timestamp);

  const parsedId: Id = {
    env: normalEnvironment,
    ulid: normalULID,
    timestamp: normalTimestamp,
  };

  return parsedId;
};

/**
 * Validates a Truestamp Id string. Does not indicate if the Id exists, only that it's structure is valid.
 * @param {string} id - A Truestamp Id string.
 * @return {boolean} - is the Id structure valid?.
 */
export const isValid = (id: string): boolean => {
  try {
    decode(id);
    return true;
  } catch (e) {
    return false;
  }
};

// Testing Only exports
export const exportedForTesting = {
  ID_PREFIX,
  normalizePrefix,
  normalizeEnvironment,
  normalizeULID,
  normalizeTimestamp,
};
