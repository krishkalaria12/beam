This package lets you extend the [Beam](https://docs.beam.com/) launcher using React and TypeScript.

[![Version](https://img.shields.io/npm/v/@beam/api.svg)](https://npmjs.org/package/@beam/api)
[![Downloads/week](https://img.shields.io/npm/dw/@beam/api.svg)](https://npmjs.org/package/@beam/api)

# Getting started

The recommend way to start developing a new extension is to [read the docs](https://docs.beam.com/extensions/introduction).

The full API reference (expect breaking changes) can be found [here](https://api-reference.beam.com).

# Installation 

Install the package:

```
bun add @beam/api
```

# Versioning

The `@beam/api` package follows the same versioning as the main `beam` binary, since the API is always embedded in the binary.

# CLI usage

The package exports the `beam-api` binary which is used to build and run extensions in development mode.

While convenience scripts are already provided in the boilerplate, you can still call the binary manually:

```bash
bunx beam-api --help

# assuming beam is running
bunx beam-api develop

bunx beam-api build -o my/output/path
```
