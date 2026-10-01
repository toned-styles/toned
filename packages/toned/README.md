# `toned` workspace placeholder

This private workspace does not provide a public umbrella API. Its empty module
keeps workspace references valid; it is not a package to install or an
alternative entry point for the scoped packages.

Use the scoped packages directly:

```ts
import { defineSystem, defineToken } from '@toned/core'
import { buildStyles } from '@toned/core/build'
import { createWebRenderer } from '@toned/core/server'
import { createElements, TonedProvider } from '@toned/react'
```

See [the core package](../toned-core/README.md) for authoring and CSS build
delivery, and [the React package](../toned-react/README.md) for components,
providers and configuration. Build inventories include every stylesheet,
including lazy routes; production rendering never injects CSS.

The scripts in this directory are experiments, not supported build commands.
`@toned/core/build` and `@toned/core/vite` own CSS delivery.
