#! /usr/bin/env node

const id = require('../lib/index.cjs');
try {
  // Unsafely decode the Id, with no HMAC validation
  const idParsed = id.decodeUnsafely({ id: process.argv[2] })
  console.log(idParsed);
} catch (error) {
  console.error(error.message);
}
