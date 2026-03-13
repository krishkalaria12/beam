# Beam Store Sample Packages

These package directories are the source inputs for the Beam store publish script.

Each package directory contains:

- `package.json`: the extension manifest/source payload that ends up inside the published zip
- `beam-store.json`: Beam store publish metadata used to generate the catalog entry and artifact metadata

Publish all current local fixtures with:

```bash
bun run store:publish:all
```

Publish one package source directory with:

```bash
bun run store:publish -- --source store/packages/beam-demo-tools-1.1.0
```
