#! /usr/bin/env node

const id = require('../dist/truestamp-id');

id.decodeIdUnsafely(process.argv[2], "").then(console.log);
