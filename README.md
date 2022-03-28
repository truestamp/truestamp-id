# Truestamp Id

## Description

A Truestamp Id serialize/deserialize library written in Typescript.

## Id Structure

```txt
T10_01FZ93KY67VYMFTVXTJ5BKWGT7_1640995200000000_63F9FA40EEC63EC865ABAB31A9ED1638

T      1       0    _   01FZ93KY67VYMFTVXTJ5BKWGT7 _   1640995200000000 _   63F9FA40EEC63EC865ABAB31A9ED1638
PREFIX VERSION TEST SEP ULID                       SEP TIMESTAMP        SEP HMAC-SHA256 (truncated to 16B)
```

Note:

* the prefix is always 'T'
* the version is currently '1'
* the test value represents a Boolean and can be a '1' (test env) or a '0' (production)
* the separator is always an underscore (`_`) to allow for double-click selection of the whole Id
* the entire Id should be lexically sortable by ULID and timestamp as the primary sorts.
* the timestamp embedded in the ULID represents creation time of the first version of an Item
* the timestamp field represents each immutable version of that Item as it changes (in microseconds since UNIX Epoch)
* the HMAC is constructed as `hmac(ID_WITHOUT_HMAC || ENVELOPE_HASH)` which allows commitment of the ID to its own contents and the Envelope hash. It can only be verified by the signer who holds the HMAC key.

## Example Code

There is a working code example for Node.js in the [/examples](/examples) directory.

## CLI

There is a **very** simple CLI that will decode a Truestamp ID and
display the data stored within it.

```sh
$ truestamp-id T10_01FZ93KY67VYMFTVXTJ5BKWGT7_1640995200000000_63F9FA40EEC63EC865ABAB31A9ED1638

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
