# `@toned/themes`

Optional theme values for the existing base vocabulary. Two explicit subpaths
are available:

```ts
// A web bundler loads the published stylesheet asset.
import '@toned/themes/shadcn/config.css'

// The token dictionary is a separate JavaScript export.
import tokens from '@toned/themes/shadcn'
```

The package build copies the exported CSS asset into its published output; the
public CSS subpath is checked by HQ's guarded package-consumer smoke test.

These files retain the historical base-system token names. The JavaScript values
include CSS units and variable references; they are not a ready-made portable
native theme. Native integrations must supply concrete values accepted by their
selected backend. A theme supplies values only: it does not install a renderer,
configure React, or generate the application's complete stylesheet inventory.

See the [React package](../toned-react/README.md) for provider-scoped themes and
[core package](../toned-core/README.md) for explicit CSS build delivery.
