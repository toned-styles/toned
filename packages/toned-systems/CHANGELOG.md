# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.0.1](https://github.com/toned-styles/toned/compare/%40toned%2Fsystems%401.0.0...%40toned%2Fsystems%401.0.1) (2026-10-10)

**Note:** Version bump only for package @toned/systems

# [1.0.0](https://github.com/toned-styles/toned/compare/%40toned%2Fsystems%400.3.0...%40toned%2Fsystems%401.0.0) (2026-10-02)

### Bug Fixes

* remove the phantom with(), add flexBasis, stop methods posing as elements ([5891af1](https://github.com/toned-styles/toned/commit/5891af161045b5fc69847ea3839d66690326138c))
* **systems:** inset tokens pass CSS lengths and expressions through ([cc25282](https://github.com/toned-styles/toned/commit/cc25282aa4f527b3aa86a6604c988d0a1a8d1790))

### Features

* consume packages from source, namespace internal config ([b84ca59](https://github.com/toned-styles/toned/commit/b84ca59e7b39df71f18bd9da0d3785cfc4b89748))
* **core+systems+react:** dimensional enumeration, animation timing, css-only group hover, tighter element props ([92e06a9](https://github.com/toned-styles/toned/commit/92e06a9f6c2c62b0515e0618dbeebc1b057cbdfb))
* **core:** string breakpoint values (rem scales), and applyState preserves foreign classes ([4e81d09](https://github.com/toned-styles/toned/commit/4e81d099cbf1331f8151a63a2a2f3c03bf947b45))
* static-CSS affordances for utility-framework hosts ([4a07f48](https://github.com/toned-styles/toned/commit/4a07f48d9c302cd0110ef475537e83fe197aed61))
* **systems:** 'fit-content' as an enumerated size value ([4f65fe4](https://github.com/toned-styles/toned/commit/4f65fe4d21ff1d968438a2b80dcb7e8391621e48))
* **systems:** 'max-content' joins the enumerated size keywords (navigation-menu's max-w-max/w-max) ([de70545](https://github.com/toned-styles/toned/commit/de7054568da47e2062a0150aaa32ee461603f381))
* **systems:** 32 joins the enumerated spacing scale (basis-32 parity) ([8c96669](https://github.com/toned-styles/toned/commit/8c966697a0ab5b75807ab891bf5febdcc11af18c))
* **systems:** export SpaceUnit from the base entry ([ae54b02](https://github.com/toned-styles/toned/commit/ae54b02d7a6e5ca89b62c96b6427d0687e643029))
* **systems:** the logical inline margins ([fba1d78](https://github.com/toned-styles/toned/commit/fba1d7899cd550c603fd37feba062129fe5179dc))

# Next release

### Added

* `marginInlineStart` and `marginInlineEnd` in the base system.
* `fit-content` and `max-content` size keywords, and step `32` on the spacing scale.
* `flexBasis`.
* `SpaceUnit` is exported from `@toned/systems/base`.

### Fixed

* Inset tokens (`top`, `right`, `bottom`, `left`) pass CSS lengths and expressions such as `50%` and `calc(100% - 2rem)` through instead of reading them as spacing aliases.

# [0.3.0](https://github.com/lttb/toned/compare/@toned/systems@0.2.0...@toned/systems@0.3.0) (2026-09-30)

### Features

* publish ([cc32fd9](https://github.com/lttb/toned/commit/cc32fd90b36d5a91fddae73700678e555201ff42))

## [0.2.1](https://github.com/lttb/toned/compare/@toned/systems@0.2.0...@toned/systems@0.2.1) (2026-09-30)

**Note:** Version bump only for package @toned/systems

# [0.2.0](https://github.com/lttb/toned/compare/@toned/systems@0.0.3...@toned/systems@0.2.0) (2026-08-05)

### Bug Fixes

* **core:** fix callback variant selector and add size tokens ([39e826f](https://github.com/lttb/toned/commit/39e826fdd382a09c9bc3bc281cc7d8fcad880c90))

### Features

* **core:** add CSS variable media mode and fix breakpoint types ([d498a31](https://github.com/lttb/toned/commit/d498a31b82b776c4564acb2f107961c79accd5d3))
* **core:** inject media ([e1df62f](https://github.com/lttb/toned/commit/e1df62fe500261e204e219347ded3be38c0a0595))
* minor updates ([7f420b3](https://github.com/lttb/toned/commit/7f420b324847c2b7ffdf040849a75ed60b345812))
* minor updates ([3e8a947](https://github.com/lttb/toned/commit/3e8a94795afc20fc506b8ef6da57e908a6a93dd2))
* overhaul ([cd39c6a](https://github.com/lttb/toned/commit/cd39c6a0fe765788f9d451094ebea325c421e56e))
* restructure the monorepo ([7571b9c](https://github.com/lttb/toned/commit/7571b9c1e54c282e27d553d47e55bdd3972a8d7f))
* rules -> config ([f2bd3eb](https://github.com/lttb/toned/commit/f2bd3ebed4f7c3775e3129fca858035c4dbc7201))
* update runtime media support ([d0a4501](https://github.com/lttb/toned/commit/d0a4501052a4c7a6145ce23d8da289d08b5d4423))

# [0.1.0](https://github.com/lttb/toned/compare/@toned/systems@0.0.3...@toned/systems@0.1.0) (2026-02-24)

### Bug Fixes

* **core:** fix callback variant selector and add size tokens ([5803d20](https://github.com/lttb/toned/commit/5803d20cedb8a625a4b8aaa551e61854fb4228a7))

### Features

* **core:** add CSS variable media mode and fix breakpoint types ([1ef3a3e](https://github.com/lttb/toned/commit/1ef3a3ed1c0edfca2f4c79e039ec436396e28a8f))
* **core:** inject media ([e1df62f](https://github.com/lttb/toned/commit/e1df62fe500261e204e219347ded3be38c0a0595))
* minor updates ([7208cb6](https://github.com/lttb/toned/commit/7208cb60950b01d29a89b0f738ea549d91beb98b))
* minor updates ([3e8a947](https://github.com/lttb/toned/commit/3e8a94795afc20fc506b8ef6da57e908a6a93dd2))
* overhaul ([a9a6673](https://github.com/lttb/toned/commit/a9a66736ac3c24eefb80c50e2205360f062007ee))
* restructure the monorepo ([7571b9c](https://github.com/lttb/toned/commit/7571b9c1e54c282e27d553d47e55bdd3972a8d7f))
* rules -> config ([f2bd3eb](https://github.com/lttb/toned/commit/f2bd3ebed4f7c3775e3129fca858035c4dbc7201))
* update runtime media support ([d0a4501](https://github.com/lttb/toned/commit/d0a4501052a4c7a6145ce23d8da289d08b5d4423))
