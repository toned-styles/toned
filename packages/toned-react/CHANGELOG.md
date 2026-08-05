# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
