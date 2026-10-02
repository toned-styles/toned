# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.0.0](https://github.com/toned-styles/toned/compare/%40toned%2Freact%400.4.0...%40toned%2Freact%401.0.0) (2026-10-02)

### Bug Fixes

* **core:** descendant bridges compile class-scoped; with() carries passed props ([e4f7448](https://github.com/toned-styles/toned/commit/e4f7448739babb9769975c13986f03d498099d85))
* **core:** refuse theme values a class cannot apply; export namespaceCss ([1f4afe6](https://github.com/toned-styles/toned/commit/1f4afe6671597b1f1eabcafca5af15df4cc81c8e))
* **core:** two parts of one family can share an element ([e5ac3a9](https://github.com/toned-styles/toned/commit/e5ac3a99893b5776b4379adf93c110d1e5551eeb))
* **react:** 'with' stays non-enumerable on bound components ([464955c](https://github.com/toned-styles/toned/commit/464955cff1850673eb81bc299a47e8eebd468e07))
* **react:** record the applied state so a stable mods object skips applyState ([e984a83](https://github.com/toned-styles/toned/commit/e984a83e671ce9101ef1721f65cd9d7a3d8ee672))
* remove the phantom with(), add flexBasis, stop methods posing as elements ([5891af1](https://github.com/toned-styles/toned/commit/5891af161045b5fc69847ea3839d66690326138c))
* **review:** ResolveContext.platform defaults to web; resolveElement resolves lazily ([4026832](https://github.com/toned-styles/toned/commit/40268328a72dd679517f8a530f9210bb041e1ded))
* type-safety restored, container numbers ride the base scale, initMedia string queries ([e191e4b](https://github.com/toned-styles/toned/commit/e191e4b5288dc9f3dd0c8d576d3edf7d6249718f))
* **types:** an override may say what the stylesheet says ([e2b02be](https://github.com/toned-styles/toned/commit/e2b02beb151104d2795da7838f894c27662b8ca0))
* **types:** infer query-builder callbacks on TypeScript 5.9 and 6 ([1c4bd90](https://github.com/toned-styles/toned/commit/1c4bd903be2f68509bcbd166b6cbcd11b9a4885c))
* **types:** keep variants inferable after making them chainable ([3abb5ac](https://github.com/toned-styles/toned/commit/3abb5ac1fcb216895a838663225eb6270d881f63))
* **types:** make a stylesheet's generics recoverable, restore with() ([ae5e532](https://github.com/toned-styles/toned/commit/ae5e532170a25690218629db70a6684ffc3d7f5a))

### Features

* consume packages from source, namespace internal config ([b84ca59](https://github.com/toned-styles/toned/commit/b84ca59e7b39df71f18bd9da0d3785cfc4b89748))
* **core+react:** bridges — styling CSS alone cannot reach from the style attribute ([df3beee](https://github.com/toned-styles/toned/commit/df3beee6b18a89e15bf1c2563cea2ff6f7c4c096))
* **core+react:** media raw-style chains + useStyles type contracts ([9696814](https://github.com/toned-styles/toned/commit/96968140b5995b460b186367ee046bce76256863))
* **core+react:** platform keys, host-tunable style type, $$type-constrained tokens ([921ad7a](https://github.com/toned-styles/toned/commit/921ad7a24250abecb389b4eed8cb427698d52dde))
* **core+systems+react:** dimensional enumeration, animation timing, css-only group hover, tighter element props ([92e06a9](https://github.com/toned-styles/toned/commit/92e06a9f6c2c62b0515e0618dbeebc1b057cbdfb))
* cross-platform container queries — [@container](https://github.com/container) var toggles on web, measured providers at runtime ([12e57cb](https://github.com/toned-styles/toned/commit/12e57cb63669e9c3e91ca66aad5ab873bc3178c3))
* **overrides:** .variants() — an override says what a declaration says ([fdbe5ad](https://github.com/toned-styles/toned/commit/fdbe5ad664782aad97e9ae3cc0d24fdf9389db7f))
* **overrides:** two tokens writing one property no longer tie ([61640dd](https://github.com/toned-styles/toned/commit/61640dd00196482423eef1418dfb5216d6dfe83c))
* **react:** bind() — mod-less stylesheet→components over resolveElement ([14d6e55](https://github.com/toned-styles/toned/commit/14d6e55089619227abea9cdbe834a2560af31dda))
* **react:** native resolveElement seam — host-provided, throws until installed ([48322ce](https://github.com/toned-styles/toned/commit/48322ce66c090273b4532b72c0d4b1cec032cb02))
* **react:** native string-as fallback infers the primitive from the tag ([99582f9](https://github.com/toned-styles/toned/commit/99582f93b212f48bf244e3aa2907c0f0e2870b6a))
* **react:** OverridableStylesheet — an emittable export type for override targets ([e112c46](https://github.com/toned-styles/toned/commit/e112c46ce83268a19bc6b2c96720856265a6be13))
* **react:** resolveElement config seam — $$type → host element (web default; native deferred) ([67b3b06](https://github.com/toned-styles/toned/commit/67b3b06825b26fc7bc1405d12b41de9310c2db29))
* **react:** scoped style overrides — the pluggable ambient-scope channel ([dd8c0ff](https://github.com/toned-styles/toned/commit/dd8c0ffcb57e8388aa7d1b458f067460729a6311))
* **react:** stylesheet overrides — identity-keyed, provider-scoped, integration-agnostic ([9320187](https://github.com/toned-styles/toned/commit/9320187b89dab1ee5748fda807f82e8bbe4149eb))
* **react:** typed 'as' on bound elements; pressable joins the $$type vocabulary ([1242e65](https://github.com/toned-styles/toned/commit/1242e6565ee0267ea0b317ea96d2015893c2cf2a))
* **react:** useBind — hook form, mods in the call, stable element components ([ed78272](https://github.com/toned-styles/toned/commit/ed78272ae2a2ee6bcb8b2ad1d2460d96f6f6eb8e))
* **react:** view is the default element, and a string as is a web-only refinement ([22b6b02](https://github.com/toned-styles/toned/commit/22b6b02d9b8aecc381d85260f9a7e2fe434f612a))
* the condition algebra — ad-hoc container widths, and/or/not, one grammar behind every @-key ([6cc15d7](https://github.com/toned-styles/toned/commit/6cc15d7fc563ca193ab3ea8e0333b661a68eaebe))

### Performance Improvements

* **types:** the brand records element KINDS, not element rules ([a3de732](https://github.com/toned-styles/toned/commit/a3de732d567e2937f22d96668edc5159ca39b770))

# Next release

### Added

* **Element families.** `createElements(sheet)` returns stable part components and a provider for the sheet's variants, created once at module scope. ([useStyles and element families](https://toned.style/api/use-styles))
* **`TonedProvider`.** Takes an explicit `renderer` and `host`; an array of renderers serves several systems in one tree. ([React reference](https://toned.style/learn/react))
* **Hosts.** `@toned/react/hosts/web` and `@toned/react/hosts/native`. ([React Native hosts](https://toned.style/learn/native))
* **Scoped overrides.** `StyleOverrides` with `overrideStyles(sheet, rules).variants(…)` customises a child's stylesheet from an ancestor. ([Extending and overriding](https://toned.style/guides/overrides))
* **Typed `as`.** A part's `as` prop checks the chosen element's or component's props and ref.
* **`withProps<Host>()`** merges props, styles, classes, handlers and refs into a part's prop bag.
* **`useBind` and `bind`** return bound part components from a stylesheet.
* **`useMotion`** in `@toned/react/motion` and adaptive layout bindings in `@toned/react/adaptive`.
* Variant defaults declared on a sheet make the matching props optional.

### Changed

* The package emits JavaScript that Node can load directly.
* `useStyles` commits its styles in a layout effect; a suspended render cannot publish variants, theme values or refs.
* On the web, a theme is switched with the `data-theme` attribute. The provider's `theme` prop is for explicit token values, such as a native renderer's.

### Fixed

* Two parts of one family can share an element: `{...s.Root.with(disabled && s.Disabled)}`.
* `as="div"` stays a literal type when `JSX.IntrinsicElements` has a pattern key.
* A stable variants object no longer re-applies unchanged state.

# [0.4.0](https://github.com/lttb/toned/compare/@toned/react@0.3.0...@toned/react@0.4.0) (2026-09-30)

### Features

* publish ([cc32fd9](https://github.com/lttb/toned/commit/cc32fd90b36d5a91fddae73700678e555201ff42))

## [0.3.1](https://github.com/lttb/toned/compare/@toned/react@0.3.0...@toned/react@0.3.1) (2026-09-30)

**Note:** Version bump only for package @toned/react

# [0.3.0](https://github.com/lttb/toned/compare/@toned/react@0.0.8...@toned/react@0.3.0) (2026-08-05)

### Bug Fixes

* **toned-react:** reconcile :active on release without leaking listeners ([0d9273c](https://github.com/lttb/toned/commit/0d9273cdd33a68eb44f3dd9ffbe0adad97da2ea7))
* **toned-react:** spread resting style and reconcile per-element interaction on commit ([fb9f782](https://github.com/lttb/toned/commit/fb9f782f2e02d3539543a07f7c5286c6292cda61))
* **types:** preserve element key types through useStyles ([bfb34bc](https://github.com/lttb/toned/commit/bfb34bc9b1d024471a2598503f6cc7814e9c79dd))

### Features

* minor updates ([9640c00](https://github.com/lttb/toned/commit/9640c000cce1ba281108a95e76be042b3b603aa1))
* minor updates ([7f420b3](https://github.com/lttb/toned/commit/7f420b324847c2b7ffdf040849a75ed60b345812))
* minor updates ([3e8a947](https://github.com/lttb/toned/commit/3e8a94795afc20fc506b8ef6da57e908a6a93dd2))
* overhaul ([cd39c6a](https://github.com/lttb/toned/commit/cd39c6a0fe765788f9d451094ebea325c421e56e))
* **react:** add .with() composition API and tokenize inline styles ([a1c0333](https://github.com/lttb/toned/commit/a1c033370e8cb20fd63fec738dd49904a333418d))
* **react:** drop old configs, improve native config resolution ([9c8fab4](https://github.com/lttb/toned/commit/9c8fab479883758dd7e01ffbbb30b31bce1be3fb))
* **react:** filter symbol keys from styles ([c0ebb7e](https://github.com/lttb/toned/commit/c0ebb7e37fa9798335bdfc921426d14dae2ee7ff))
* **react:** improve type inference for styles ([ac97261](https://github.com/lttb/toned/commit/ac97261532b7390686dee51f05bf802f81984cc6))
* **react:** improve variants type ([8cb6793](https://github.com/lttb/toned/commit/8cb67939d0c2e7cfc09bfccdb0bbc406dbe4429f))
* restructure the monorepo ([7571b9c](https://github.com/lttb/toned/commit/7571b9c1e54c282e27d553d47e55bdd3972a8d7f))
* **toned-react:** per-element hover/active/focus for multi-instance stylesheets ([dbe7429](https://github.com/lttb/toned/commit/dbe7429be8e027fb5edbe135980ccb7a17247831))
* update readme ([32bc1c8](https://github.com/lttb/toned/commit/32bc1c8ffcba973ec977c31635fd9a2e7941065c))

### Performance Improvements

* **toned-react:** back multi-instance refs with a Set and prune lazily ([cddcdf3](https://github.com/lttb/toned/commit/cddcdf33a5b9d94ca2f4382a50107cb6a5e872a8))

### BREAKING CHANGES

* **toned-react:** react-native no longer returns a `style(state)` callback for
interactive elements; it now spreads interaction event handlers (onPressIn/
onPressOut, onHoverIn/onHoverOut, onFocus/onBlur). Consumers relying on the
style-function contract must spread the returned props onto a Pressable/host
component instead.

# [0.1.0](https://github.com/lttb/toned/compare/@toned/react@0.0.8...@toned/react@0.1.0) (2026-02-24)

### Bug Fixes

* **types:** preserve element key types through useStyles ([2cc4635](https://github.com/lttb/toned/commit/2cc4635cfe016a1dec7793d584f13cd226ba6e82))

### Features

* minor updates ([7abd43f](https://github.com/lttb/toned/commit/7abd43f5e7a396ae7e1fb0afbee80d69e9bafa8e))
* minor updates ([7208cb6](https://github.com/lttb/toned/commit/7208cb60950b01d29a89b0f738ea549d91beb98b))
* minor updates ([3e8a947](https://github.com/lttb/toned/commit/3e8a94795afc20fc506b8ef6da57e908a6a93dd2))
* overhaul ([a9a6673](https://github.com/lttb/toned/commit/a9a66736ac3c24eefb80c50e2205360f062007ee))
* **react:** add .with() composition API and tokenize inline styles ([15be2e8](https://github.com/lttb/toned/commit/15be2e866154ae9735648db6f603b27e1b354539))
* **react:** drop old configs, improve native config resolution ([9c8fab4](https://github.com/lttb/toned/commit/9c8fab479883758dd7e01ffbbb30b31bce1be3fb))
* **react:** filter symbol keys from styles ([8e0749e](https://github.com/lttb/toned/commit/8e0749e0ff240b569e9083c971dbf3f7f8c99453))
* **react:** improve type inference for styles ([7db91fe](https://github.com/lttb/toned/commit/7db91fecfc788d632c1574c24cff03bdb0c41535))
* **react:** improve variants type ([77bf8af](https://github.com/lttb/toned/commit/77bf8afa213c9eff4aa13ae2ff4f7bff5f3a4997))
* restructure the monorepo ([7571b9c](https://github.com/lttb/toned/commit/7571b9c1e54c282e27d553d47e55bdd3972a8d7f))
* update readme ([32bc1c8](https://github.com/lttb/toned/commit/32bc1c8ffcba973ec977c31635fd9a2e7941065c))
