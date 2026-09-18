# `toned` workspace placeholder

This private workspace does not provide a public umbrella API. Its empty module
is retained only to keep existing workspace references valid; it is not a package
to install or an alternative entry point for the scoped packages.

Use the implemented packages directly:

```ts
import { defineSystem, defineToken } from '@toned/core'
import { createElements, TonedProvider } from '@toned/react'
import { buildStyles } from '@toned/core/build'
import { createWebRenderer } from '@toned/core/server'
```

See [the React package](../toned-react/README.md) for the complete authoring,
configuration and CSS build flow. Build inventories include every stylesheet,
including lazy routes; production rendering never injects CSS.

The scripts in this directory are historical experiments, not supported build
commands. `@toned/core/build` and the `@toned/core/vite` integration own CSS delivery.
