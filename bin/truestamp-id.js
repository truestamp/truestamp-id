#! /usr/bin/env node

const id = require('../dist/truestamp-id');

const idParsed = JSON.parse(id.decodeToJSON(process.argv[2]))
console.log(JSON.stringify(idParsed, null, 2));
