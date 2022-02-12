# Truestamp ID

## Description

An ID serialize/deserialize utility written in Typescript that supports Node.js.

## ID Structure

```txt
T1201FFZSB24K0QMTG2YBW3A6DYYR_0

T      1   2      01FFZSB24K0QMTG2YBW3A6DYYR _   0
PREFIX ENV REGION ULID                       SEP VERSION
```

## Example Code

There is a working code example for Node.js in the [/examples](/examples) directory.

## CLI

There is a **very** simple CLI that will decode a Truestamp ID and
display the data stored within it.

```sh
$ truestamp-id T1201FFZSB24K0QMTG2YBW3A6DYYR_0

{
  "prefix": "T",
  "env": "PRODUCTION",
  "region": "US_EAST_1",
  "ulid": "01FFZSB24K0QMTG2YBW3A6DYYR",
  "ulidTimestamp": 1632080595091,
  "version": 0
}
```

## Contributing

* Commit changes, merge PR's to `main` branch
* Bump `version` field in `package.json`
* Cut a new [release](https://github.com/truestamp/truestamp-id/releases)
* New release will trigger workflow to build, test, and publish private package to [Github Package Registry](https://github.com/truestamp/truestamp-id/packages).

## Legal

Copyright © 2021-2022 Truestamp Inc. All Rights Reserved.
