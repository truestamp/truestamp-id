# Truestamp Id

## Description

A Truestamp Id serialize/deserialize library written in Typescript.

## Id Structure

```txt
t_live_01FFZSB24K0QMTG2YBW3A6DYYR_1640995200000000

t      _   live _   01FFZSB24K0QMTG2YBW3A6DYYR _   1640995200000000
PREFIX SEP ENV  SEP ULID                       SEP TIMESTAMP
```

Note:

* the prefix is always 't'
* the separator is always an underscore (`_`) to allow for double-click selection of the whole Id
* the environment can be one of 'live' or 'test'
* the entire Id should be lexically sortable by environment, item id (ULID), and finally by timestamp version within an item.
* the timestamp embedded in the ULID represents creation time of the first version of an item and should be sourced from [https://github.com/truestamp/ulid-generator](ulid-generator) to ensure monotonicity.
* the timestamp field represents each immutable version of that item as it changes (microseconds since UNIX Epoch)

## Example Code

There is a working code example for Node.js in the [/examples](/examples) directory.

## CLI

There is a **very** simple CLI that will decode a Truestamp ID and
display the data stored within it.

```sh
$ truestamp-id t_live_01FFZSB24K0QMTG2YBW3A6DYYR_1644772755000000

{
  "env": "live",
  "ulid": "01FVT3WY91XS23HQ32NHA9AD24",
  "timestamp": 1640995200000000
}
```

## Contributing

* Commit changes, merge PR's to `main` branch
* Bump `version` field in `package.json`
* Cut a new [release](https://github.com/truestamp/truestamp-id/releases)
* New release will trigger workflow to build, test, and publish private package to [Github Package Registry](https://github.com/truestamp/truestamp-id/packages).

## Legal

Copyright © 2021-2022 Truestamp Inc. All Rights Reserved.
