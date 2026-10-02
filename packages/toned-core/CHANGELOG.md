# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.0.0](https://github.com/toned-styles/toned/compare/%40toned%2Fcore%400.6.0...%40toned%2Fcore%401.0.0) (2026-10-02)

### Bug Fixes

* **core:** breakpoint chains kebab-case the key, matching generate's toggles ([1f5b5c7](https://github.com/toned-styles/toned/commit/1f5b5c7c451c74ac89e8506af83a404fe99a653c))
* **core:** bridge fallbacks preserve inheritance — inherited properties fall back to inherit, not initial ([9d72e8c](https://github.com/toned-styles/toned/commit/9d72e8c5058feff61f02db302aede3ddd203b16f))
* **core:** chain values reach class fidelity; resting fallback crosses tokens ([8d01815](https://github.com/toned-styles/toned/commit/8d018155d268ab562401ef4d5c55ddfe556102bb))
* **core:** descendant bridges compile class-scoped; with() carries passed props ([e4f7448](https://github.com/toned-styles/toned/commit/e4f7448739babb9769975c13986f03d498099d85))
* **core:** extend() beats variant values for the properties it names ([b856f58](https://github.com/toned-styles/toned/commit/b856f584aab5f2f27e1c0361f8725e24970ccbd1))
* **core:** keep the caller's scope intact for every scoped selector ([a02be1f](https://github.com/toned-styles/toned/commit/a02be1f0a292b05a7b33916473268b3b371e98f2))
* **core:** media-only values chain OPEN, and t() carries nested pseudo/breakpoint blocks ([543f600](https://github.com/toned-styles/toned/commit/543f600e496ef228bd4f914d6c57dbfb78704fd5))
* **core:** multiply the source alpha channel instead of replacing it ([f3eee32](https://github.com/toned-styles/toned/commit/f3eee32e7e01e0a9975ec6e291a6c26e8ef74cf6))
* **core:** refuse theme values a class cannot apply; export namespaceCss ([1f4afe6](https://github.com/toned-styles/toned/commit/1f4afe6671597b1f1eabcafca5af15df4cc81c8e))
* **core:** the sibling and focus-within channels reach the painted property ([fe2ccb7](https://github.com/toned-styles/toned/commit/fe2ccb73b52a8932ca4ff8538b451579b23aa499))
* **core:** two parts of one family can share an element ([e5ac3a9](https://github.com/toned-styles/toned/commit/e5ac3a99893b5776b4379adf93c110d1e5551eeb))
* **review:** ResolveContext.platform defaults to web; resolveElement resolves lazily ([4026832](https://github.com/toned-styles/toned/commit/40268328a72dd679517f8a530f9210bb041e1ded))
* type-safety restored, container numbers ride the base scale, initMedia string queries ([e191e4b](https://github.com/toned-styles/toned/commit/e191e4b5288dc9f3dd0c8d576d3edf7d6249718f))
* **types:** an override may say what the stylesheet says ([e2b02be](https://github.com/toned-styles/toned/commit/e2b02beb151104d2795da7838f894c27662b8ca0))
* **types:** infer query-builder callbacks on TypeScript 5.9 and 6 ([1c4bd90](https://github.com/toned-styles/toned/commit/1c4bd903be2f68509bcbd166b6cbcd11b9a4885c))
* **types:** keep variants inferable after making them chainable ([3abb5ac](https://github.com/toned-styles/toned/commit/3abb5ac1fcb216895a838663225eb6270d881f63))
* **types:** make a stylesheet's generics recoverable, restore with() ([ae5e532](https://github.com/toned-styles/toned/commit/ae5e532170a25690218629db70a6684ffc3d7f5a))
* **types:** make the type surface describe what the runtime actually does ([c51d84c](https://github.com/toned-styles/toned/commit/c51d84c5fb8ef854cc2879ffe62cac0522bedd15))

### Features

* consume packages from source, namespace internal config ([b84ca59](https://github.com/toned-styles/toned/commit/b84ca59e7b39df71f18bd9da0d3785cfc4b89748))
* **core+react:** bridges — styling CSS alone cannot reach from the style attribute ([df3beee](https://github.com/toned-styles/toned/commit/df3beee6b18a89e15bf1c2563cea2ff6f7c4c096))
* **core+react:** media raw-style chains + useStyles type contracts ([9696814](https://github.com/toned-styles/toned/commit/96968140b5995b460b186367ee046bce76256863))
* **core+react:** platform keys, host-tunable style type, $$type-constrained tokens ([921ad7a](https://github.com/toned-styles/toned/commit/921ad7a24250abecb389b4eed8cb427698d52dde))
* **core+systems+react:** dimensional enumeration, animation timing, css-only group hover, tighter element props ([92e06a9](https://github.com/toned-styles/toned/commit/92e06a9f6c2c62b0515e0618dbeebc1b057cbdfb))
* **core:** compound state+pseudo keys — ':open:hover' with AND semantics in css chain mode ([a461b48](https://github.com/toned-styles/toned/commit/a461b482c870378becb53e820eb5549e7dfd27a9))
* **core:** condition breakpoints — a parenthesised value is a raw media condition ([b66697a](https://github.com/toned-styles/toned/commit/b66697ae02efe2075af7af07f82d95c8d9298cdb))
* **core:** cross-element state channel — 'source:<state>' → descendant ([a07f0c7](https://github.com/toned-styles/toned/commit/a07f0c7ec64610e12efca3f46c4aa50e90e877e4))
* **core:** declared states — static attribute/pseudo selectors, the breakpoint analogue ([34eadba](https://github.com/toned-styles/toned/commit/34eadba0085daff3822a763a8164ebc41056661a))
* **core:** defineAnimations — named, system-compiled motion ([a72f7d7](https://github.com/toned-styles/toned/commit/a72f7d772598f33e1c0733520506fe6145af6980))
* **core:** definePalette + generatePalette — first-class themes ([0dedc9a](https://github.com/toned-styles/toned/commit/0dedc9a4a0725da575cb5831a29ba510f271fd8d))
* **core:** elementDescriptors() — runtime element list with $$type for bindings ([953936b](https://github.com/toned-styles/toned/commit/953936b7c5b3b44d2e98977507e4136f040d4b8a))
* **core:** generate() takes a scope selector so two systems share one page ([47178e6](https://github.com/toned-styles/toned/commit/47178e68ab9b3b0703a67008476dbcafd14ff161))
* **core:** inherit — the third $types state, a text token legal on a View ([c1a159a](https://github.com/toned-styles/toned/commit/c1a159a23ee7e4cd1cf34b4fda05b899e04d9f51))
* **core:** instance sharing + loud failure modes ([3aea5ec](https://github.com/toned-styles/toned/commit/3aea5ec59c0efa64369ee3d491ffc59d3b81f167))
* **core:** per-platform token resolve — resolve(value, tokens, { platform }) ([0679217](https://github.com/toned-styles/toned/commit/067921770ff1c3b2bec967465a7df64deb11e0fd))
* **core:** responsive atomic classes — breakpoint overrides for opted tokens compile to media-scoped classes ([a15984e](https://github.com/toned-styles/toned/commit/a15984eb8c7da6d73ff56b8ffc1fe6956af9cf3f))
* **core:** sibling-source and focus-within channels ([5dca0a2](https://github.com/toned-styles/toned/commit/5dca0a2ac84db89a7360b8b63782339bbeeaf116))
* **core:** string breakpoint values (rem scales), and applyState preserves foreign classes ([4e81d09](https://github.com/toned-styles/toned/commit/4e81d099cbf1331f8151a63a2a2f3c03bf947b45))
* **core:** the alpha modifier, hover gating, focus-visible, alpha-aware override chains ([98607f2](https://github.com/toned-styles/toned/commit/98607f2b140573dcd5f9df896b4eb1ddd9bbc101))
* **core:** the build writes a system's declared themes ([ef6f4ba](https://github.com/toned-styles/toned/commit/ef6f4baff01b013876a1fe650195221aab1341be))
* **core:** token pseudoRules — the one sanctioned pseudo-element channel ([303738a](https://github.com/toned-styles/toned/commit/303738a9dbf3f2d30cc695c1bc5d4907b22efe5a))
* cross-platform container queries — [@container](https://github.com/container) var toggles on web, measured providers at runtime ([12e57cb](https://github.com/toned-styles/toned/commit/12e57cb63669e9c3e91ca66aad5ab873bc3178c3))
* **overrides:** .variants() — an override says what a declaration says ([fdbe5ad](https://github.com/toned-styles/toned/commit/fdbe5ad664782aad97e9ae3cc0d24fdf9389db7f))
* **overrides:** two tokens writing one property no longer tie ([61640dd](https://github.com/toned-styles/toned/commit/61640dd00196482423eef1418dfb5216d6dfe83c))
* **react:** resolveElement config seam — $$type → host element (web default; native deferred) ([67b3b06](https://github.com/toned-styles/toned/commit/67b3b06825b26fc7bc1405d12b41de9310c2db29))
* **react:** scoped style overrides — the pluggable ambient-scope channel ([dd8c0ff](https://github.com/toned-styles/toned/commit/dd8c0ffcb57e8388aa7d1b458f067460729a6311))
* **react:** typed 'as' on bound elements; pressable joins the $$type vocabulary ([1242e65](https://github.com/toned-styles/toned/commit/1242e6565ee0267ea0b317ea96d2015893c2cf2a))
* static-CSS affordances for utility-framework hosts ([4a07f48](https://github.com/toned-styles/toned/commit/4a07f48d9c302cd0110ef475537e83fe197aed61))
* the ':rtl' runtime seam — getDirection on the config answers every <element>:rtl mod ([65bfca9](https://github.com/toned-styles/toned/commit/65bfca9e0f7daed931e57dd12116d597206029b1))
* the condition algebra — ad-hoc container widths, and/or/not, one grammar behind every @-key ([6cc15d7](https://github.com/toned-styles/toned/commit/6cc15d7fc563ca193ab3ea8e0333b661a68eaebe))

### Performance Improvements

* **types:** the brand records element KINDS, not element rules ([a3de732](https://github.com/toned-styles/toned/commit/a3de732d567e2937f22d96668edc5159ca39b770))

# Next release

### Added

* **Descriptor systems.** `defineSystem({ id, tokens, conditions, themes })` declares a namespaced system; the returned object is what builds and renderers take. ([defineSystem](https://toned.style/api/define-system))
* **Typed query builder.** `stylesheet(q => …)` and `.variants(($, q) => …)` receive `q.state`, `q.media`, `q.container`, `q.part(…).state`, `q.part(…).has`, `q.platform`, `q.all`, `q.any` and `q.not`. Each returns a literal key that is checked against the system. ([Conditions and selectors](https://toned.style/api/conditions))
* **Readable key aliases.** `'@media md'`, `'@container field wide'` and `'@platform web'` are accepted beside `'@md'`, `'@field/wide'` and `'@platform.web'`; `$kind` and `$style` name what `$$type` and `style` did. ([Conditions and selectors](https://toned.style/api/conditions))
* **Checked variants.** Annotating the callback parameter with `Variants<Mods>` infers the axes and checks every returned rule, including nested ones. A second argument, `{ defaults }`, makes an axis optional. ([variants](https://toned.style/api/variants))
* **Container queries** on web and native, from containers declared in the system or a fixed `dp()` width at the use site.
* **Declared states and cross-part states.** A system's `states` become `':open'`-style keys; `'Root:hover'` styles other parts from one part's state; `':focus-visible'`, `':focus-within'`, compound keys such as `':open:hover'`, and relationship queries with `q.part(…).has(…)`. ([Interactive styles](https://toned.style/guides/interactive))
* **Platform blocks.** `'@platform web'` and `'@platform native'` hold platform-only declarations and widen `$style` to that platform's types.
* **Themes in the build.** Themes declared on a system are written by `buildStyles` and the Vite plugin as custom properties: the first on `:root`, each under `[data-theme='<name>']`. `generateThemes` returns that CSS alone, and the `themes` option picks the default or turns it off. ([Theming](https://toned.style/guides/theming))
* **Typed theme schemas** with `defineTokenFor<Theme>()`, and `definePalette` / `generatePalette`.
* **Pure renderers** in `@toned/core/server`: `createWebRenderer`, `createNativeRenderer`, `createInlineRenderer` for email and static HTML, and `createPdfRenderer`. They resolve part props without hooks, so they run in Server Components. ([SSR and Server Components](https://toned.style/guides/ssr), [Web, email and PDF](https://toned.style/learn/renderers))
* **Build output with a manifest.** `buildStyles` in `@toned/core/build` returns the CSS and a manifest that a renderer validates; the Vite plugin serves them as `virtual:toned.css` and `virtual:toned.manifest`. `assertBuildArtifact` checks the pair before publication.
* **Authoritative overrides.** `overrideSheet(sheet, rules, variants?)` adds a higher-priority layer, and `null` removes an inherited declaration. `sheet.extend(rules)` derives new defaults that the sheet's variants still override. ([Extending and overriding](https://toned.style/guides/overrides))
* **Typed web grid.** `defineGrid`, `$grid` and `$area`, with responsive plans from `.variant(…)`. ([Grid example](https://toned.style/examples#grid))
* **Web-only selectors.** `$webRules: webRules({ … })` for pseudo-elements and DOM selectors, with explicit media groups.
* **`t()` blocks.** The inline helper accepts `':hover'` and breakpoint blocks.
* **Colour alpha.** `alpha('primary', 0.2)` for tokens that declare an alpha channel.
* **Adaptive layouts** in `@toned/core/adaptive` and **motion** in `@toned/core/motion`. ([Adaptive layouts](https://toned.style/learn/adaptive), [Motion and presence](https://toned.style/learn/motion))
* **Output backends** in `@toned/core/backends`, including a built Tailwind profile. ([Backend integrations](https://toned.style/learn/backends))
* `externalCssVariables` keeps named custom properties of the host application out of a system's namespace.
* `namespaceCss` is exported from `@toned/core/system`, to give a separately generated palette the system's prefix.
* `defineAnimations` for named keyframes compiled with the system.

### Changed

* A `.variants()` callback without explicit type arguments is fully checked: keys that were silently accepted before, such as a misspelled part or token, are now errors.
* The standalone `bp`, `cq`, `and`, `or` and `not` condition builders moved to `@toned/core/compat`. New declarations use the system's `q`.
* The Vite plugin no longer adds a style element to the HTML; import `virtual:toned.css`. Injecting styles at runtime is a development helper in `@toned/core/dev/inject`.
* Type checking a stylesheet costs less: parts are validated once against a shape shared by every sheet of a system.
* Token names in the build manifest are compared in name order, so a bundler that reorders module exports does not invalidate an unchanged system.
* The types are checked against TypeScript 5.9, 6 and 7; TypeScript 5.9 is the minimum supported version.

### Fixed

* Two parts of one family can be merged onto one element; each keeps its own styles and removing one leaves the other.
* The build refuses a theme value that a generated class cannot apply, such as `3px 0 0 0` in a field read by a four-sided property.
* Scoped CSS keeps the caller's scope for every selector, including `:root` and `[data-theme]` rules.
* `t()` skips falsy arguments and unwraps nested `t()` results.
* The alpha modifier multiplies a colour's own alpha instead of replacing it, and generated alpha colours work without relative colour syntax.
* Custom properties pass through the style pipeline unchanged.
* React Native array styles are flattened before merging.
* An inherited property falls back to `inherit`, not `initial`, when a condition does not apply.

# [0.6.0](https://github.com/lttb/toned/compare/@toned/core@0.4.0...@toned/core@0.6.0) (2026-09-30)

### Bug Fixes

* **toned-core:** correct the CSS that generate() emits ([555c2cb](https://github.com/lttb/toned/commit/555c2cb69cdafad4565629ac244f16cbcc550848))
* **toned-core:** flatten React Native array styles when merging ([281e2c0](https://github.com/lttb/toned/commit/281e2c0b688251cbce0f50e85388d7b0ce47984f))
* **toned-core:** handle custom properties correctly in the style pipeline ([2cbafd3](https://github.com/lttb/toned/commit/2cbafd38778adae2d6831e5cd992d97b72daa2f1))
* **toned-core:** restore redundant-write skip lost in merge ([119ee6d](https://github.com/lttb/toned/commit/119ee6d1bd9b232524d6c8dcc7c27050629308f8))
* **toned-core:** skip falsy t() arguments and unwrap nested t() blocks ([1fd88e0](https://github.com/lttb/toned/commit/1fd88e0ded7116641f9cc0862dd561b9df226912))

### Features

* publish ([cc32fd9](https://github.com/lttb/toned/commit/cc32fd90b36d5a91fddae73700678e555201ff42))
* **toned-core:** support breakpoint and pseudo blocks in t() ([08994e8](https://github.com/lttb/toned/commit/08994e81c9d36d72e62ed83ef3df12d3d558cfce))

# [0.5.0](https://github.com/lttb/toned/compare/@toned/core@0.4.0...@toned/core@0.5.0) (2026-09-30)

### Bug Fixes

* **toned-core:** correct the CSS that generate() emits ([555c2cb](https://github.com/lttb/toned/commit/555c2cb69cdafad4565629ac244f16cbcc550848))
* **toned-core:** flatten React Native array styles when merging ([281e2c0](https://github.com/lttb/toned/commit/281e2c0b688251cbce0f50e85388d7b0ce47984f))
* **toned-core:** handle custom properties correctly in the style pipeline ([2cbafd3](https://github.com/lttb/toned/commit/2cbafd38778adae2d6831e5cd992d97b72daa2f1))
* **toned-core:** restore redundant-write skip lost in merge ([119ee6d](https://github.com/lttb/toned/commit/119ee6d1bd9b232524d6c8dcc7c27050629308f8))
* **toned-core:** skip falsy t() arguments and unwrap nested t() blocks ([1fd88e0](https://github.com/lttb/toned/commit/1fd88e0ded7116641f9cc0862dd561b9df226912))

### Features

* **toned-core:** support breakpoint and pseudo blocks in t() ([08994e8](https://github.com/lttb/toned/commit/08994e81c9d36d72e62ed83ef3df12d3d558cfce))

# [0.4.0](https://github.com/lttb/toned/compare/@toned/core@0.0.9...@toned/core@0.4.0) (2026-08-05)

### Bug Fixes

* **core:** allow falsy token values like 0 in exec ([e725082](https://github.com/lttb/toned/commit/e7250826b640188f83b730999d067b0942df78be))
* **core:** fix callback variant selector and add size tokens ([39e826f](https://github.com/lttb/toned/commit/39e826fdd382a09c9bc3bc281cc7d8fcad880c90))
* **core:** wrap media query CSS variables in html selector ([adb474c](https://github.com/lttb/toned/commit/adb474c5cd9446917b2429549d79361f69230368))
* **stylesheet:** make VariantBuilder extend string for computed property keys ([d2c3002](https://github.com/lttb/toned/commit/d2c3002036dedf8b2c2bfe163c8d3ad9943011b8))
* **stylesheet:** use template literal types for variant keys ([722babc](https://github.com/lttb/toned/commit/722babcbf0bc0ae8446f6509f8af805f4461a34c))
* **toned-core:** make pseudo raw-style vs token precedence deterministic ([c98b777](https://github.com/lttb/toned/commit/c98b777b635d51a8ee1f385261978d09a890ff2b))
* **toned-core:** resolve declarative style pseudo-free and clean up on unmount ([fd37420](https://github.com/lttb/toned/commit/fd3742093fdd15a02c9bc6ae04f9ebbd30b2bd3c))
* **toned-core:** resolve interactive multi-instance styles per element on contextless updates ([e074a2f](https://github.com/lttb/toned/commit/e074a2f0cd2420d837a50b316af4d04190f1ed7b))
* **toned-core:** restore inline style baselines by ownership ([e2c3bba](https://github.com/lttb/toned/commit/e2c3bbadf6444c25119562686312cf2c6fd13ba5))
* **toned-core:** stop cross-element interaction leaking across instances ([6fe74c5](https://github.com/lttb/toned/commit/6fe74c5b9dfd487934f699eb0cc374e0feab66fd))
* **types:** preserve element key types through useStyles ([bfb34bc](https://github.com/lttb/toned/commit/bfb34bc9b1d024471a2598503f6cc7814e9c79dd))
* use .js extensions in package.json exports for published output ([9fc746d](https://github.com/lttb/toned/commit/9fc746db955b6b1ab9054708b7c972844e9e5b3b))

### Features

* add initial support for static pseudos ([6e08762](https://github.com/lttb/toned/commit/6e08762b43f89173d6309723cd413fdbd8f858d4))
* **core:** add CSS variable media mode and fix breakpoint types ([d498a31](https://github.com/lttb/toned/commit/d498a31b82b776c4564acb2f107961c79accd5d3))
* **core:** add CSS-only pseudo-state support via pseudoMode: 'css' ([985cf58](https://github.com/lttb/toned/commit/985cf58e283e9092f3416ebe2ef5f821080d5fa3))
* **core:** add root-level media queries and fix docs hydration ([034ba14](https://github.com/lttb/toned/commit/034ba1434ac571a7263767ca972f751af0edfbce))
* **core:** add Vite plugin for static CSS generation ([2174285](https://github.com/lttb/toned/commit/217428558cf2aedf9eabae40dc889139f800c3b6))
* **core:** defineSystem types ([c3484cc](https://github.com/lttb/toned/commit/c3484cc0d072bb5b3f56f9656580ab34c7a0621c))
* **core:** inject media ([e1df62f](https://github.com/lttb/toned/commit/e1df62fe500261e204e219347ded3be38c0a0595))
* **core:** minor update ([534208f](https://github.com/lttb/toned/commit/534208f40b3270556974d1888ad44b2232f382d1))
* **core:** minor updates ([b9be0aa](https://github.com/lttb/toned/commit/b9be0aab44e6f1941808bdfc0e626bb93decdb7d))
* **core:** use breakpoints config for runtime media ([e7634c2](https://github.com/lttb/toned/commit/e7634c242f28c3fa3c0b40167abba99cdb51462c))
* infer breakpoints from config, improve breakpoints types ([997e927](https://github.com/lttb/toned/commit/997e92744c02633d277eeee9ec5a4a00ac536355))
* migrate stylesheet API to new flat interface (TASK_2) ([e8d98ea](https://github.com/lttb/toned/commit/e8d98ea5c32578de5275cdcab20e50b88b001aed))
* minor updates ([7f420b3](https://github.com/lttb/toned/commit/7f420b324847c2b7ffdf040849a75ed60b345812))
* minor updates ([3e8a947](https://github.com/lttb/toned/commit/3e8a94795afc20fc506b8ef6da57e908a6a93dd2))
* overhaul ([cd39c6a](https://github.com/lttb/toned/commit/cd39c6a0fe765788f9d451094ebea325c421e56e))
* restructure the monorepo ([7571b9c](https://github.com/lttb/toned/commit/7571b9c1e54c282e27d553d47e55bdd3972a8d7f))
* **StyleMatcher:** updates ([d499a40](https://github.com/lttb/toned/commit/d499a409b089692c1213d7aaa7c43e6b7bb81a62))
* **stylesheet:** add callback-based variants API with type-safe selectors ([10acd34](https://github.com/lttb/toned/commit/10acd34c2e0ecf75400e2b9ca5fd95f587ab738b))
* **stylesheet:** update types - wip ([52cdb57](https://github.com/lttb/toned/commit/52cdb57713fc3d2b90a8066b6f140065764cb718))
* task 5 ([8bc25ba](https://github.com/lttb/toned/commit/8bc25bacd70d443f4613a4f62ab91442daca7ade))
* **toned-core:** 0.2.0 ([e81fcab](https://github.com/lttb/toned/commit/e81fcab2ce6ecb9ff8300139f4e0714d4617b3f1))
* **toned-core:** loosen the style type temporarily ([fc921fd](https://github.com/lttb/toned/commit/fc921fd4ef0d7317a2d7775ee0361364aaa1f333))
* **toned-core:** per-element interaction resolution and style deep-merge ([bf4268c](https://github.com/lttb/toned/commit/bf4268cea6e61f9dae2e0177b66a81fb44d7b20c))
* update readme ([32bc1c8](https://github.com/lttb/toned/commit/32bc1c8ffcba973ec977c31635fd9a2e7941065c))
* update runtime media support ([d0a4501](https://github.com/lttb/toned/commit/d0a4501052a4c7a6145ce23d8da289d08b5d4423))

### Performance Improvements

* **toned-core:** bound StyleMatcher match cache with an LRU cap ([39d3fe8](https://github.com/lttb/toned/commit/39d3fe87e6df14239df0f47d0ea10ffa8a61311f))
* **toned-core:** skip redundant style writes to unchanged siblings ([c2157b4](https://github.com/lttb/toned/commit/c2157b4348b1b63cc2935a9e376467e7aa66a7aa))
* **toned-react:** back multi-instance refs with a Set and prune lazily ([cddcdf3](https://github.com/lttb/toned/commit/cddcdf33a5b9d94ca2f4382a50107cb6a5e872a8))

# [0.1.0](https://github.com/lttb/toned/compare/@toned/core@0.0.9...@toned/core@0.1.0) (2026-02-24)

### Bug Fixes

* **core:** allow falsy token values like 0 in exec ([d201ed7](https://github.com/lttb/toned/commit/d201ed7690b2bba8ec37107e525594d7b48ac202))
* **core:** fix callback variant selector and add size tokens ([5803d20](https://github.com/lttb/toned/commit/5803d20cedb8a625a4b8aaa551e61854fb4228a7))
* **core:** wrap media query CSS variables in html selector ([6425a93](https://github.com/lttb/toned/commit/6425a931b39a5307ea6abd8bbcc29c119c705668))
* **stylesheet:** make VariantBuilder extend string for computed property keys ([1de8f82](https://github.com/lttb/toned/commit/1de8f825347c1e64e66eb5640600373a32d89644))
* **stylesheet:** use template literal types for variant keys ([1acbe7e](https://github.com/lttb/toned/commit/1acbe7ebfdc01843692f1577e1613119da812a33))
* **types:** preserve element key types through useStyles ([2cc4635](https://github.com/lttb/toned/commit/2cc4635cfe016a1dec7793d584f13cd226ba6e82))

### Features

* add initial support for static pseudos ([6e08762](https://github.com/lttb/toned/commit/6e08762b43f89173d6309723cd413fdbd8f858d4))
* **core:** add CSS variable media mode and fix breakpoint types ([1ef3a3e](https://github.com/lttb/toned/commit/1ef3a3ed1c0edfca2f4c79e039ec436396e28a8f))
* **core:** add CSS-only pseudo-state support via pseudoMode: 'css' ([73745e4](https://github.com/lttb/toned/commit/73745e4025aa2a470ee6f9c548e597c3b1a35a7a))
* **core:** add root-level media queries and fix docs hydration ([e4f57e9](https://github.com/lttb/toned/commit/e4f57e9cf34dc81e61f53435440d9e340a285703))
* **core:** add Vite plugin for static CSS generation ([0f76f10](https://github.com/lttb/toned/commit/0f76f108a199ea3ec2368f908ca3b489b04c449b))
* **core:** defineSystem types ([c3484cc](https://github.com/lttb/toned/commit/c3484cc0d072bb5b3f56f9656580ab34c7a0621c))
* **core:** inject media ([e1df62f](https://github.com/lttb/toned/commit/e1df62fe500261e204e219347ded3be38c0a0595))
* **core:** minor update ([534208f](https://github.com/lttb/toned/commit/534208f40b3270556974d1888ad44b2232f382d1))
* **core:** minor updates ([b9be0aa](https://github.com/lttb/toned/commit/b9be0aab44e6f1941808bdfc0e626bb93decdb7d))
* **core:** use breakpoints config for runtime media ([e7634c2](https://github.com/lttb/toned/commit/e7634c242f28c3fa3c0b40167abba99cdb51462c))
* infer breakpoints from config, improve breakpoints types ([997e927](https://github.com/lttb/toned/commit/997e92744c02633d277eeee9ec5a4a00ac536355))
* migrate stylesheet API to new flat interface (TASK_2) ([e8d98ea](https://github.com/lttb/toned/commit/e8d98ea5c32578de5275cdcab20e50b88b001aed))
* minor updates ([7208cb6](https://github.com/lttb/toned/commit/7208cb60950b01d29a89b0f738ea549d91beb98b))
* minor updates ([3e8a947](https://github.com/lttb/toned/commit/3e8a94795afc20fc506b8ef6da57e908a6a93dd2))
* overhaul ([a9a6673](https://github.com/lttb/toned/commit/a9a66736ac3c24eefb80c50e2205360f062007ee))
* restructure the monorepo ([7571b9c](https://github.com/lttb/toned/commit/7571b9c1e54c282e27d553d47e55bdd3972a8d7f))
* **StyleMatcher:** updates ([0e0e413](https://github.com/lttb/toned/commit/0e0e413e16b163e8156cf6bd1c9b4be2fd5fbaf9))
* **stylesheet:** add callback-based variants API with type-safe selectors ([5a0cda1](https://github.com/lttb/toned/commit/5a0cda1a8d41eecea82dc292dbed4b74bc825742))
* **stylesheet:** update types - wip ([dc3efd0](https://github.com/lttb/toned/commit/dc3efd0af3fb5d33649753b1b23d095397feea46))
* task 5 ([7cd6b4e](https://github.com/lttb/toned/commit/7cd6b4ef647b74b73bd4bfb0f1a028874ac924a6))
* update readme ([32bc1c8](https://github.com/lttb/toned/commit/32bc1c8ffcba973ec977c31635fd9a2e7941065c))
* update runtime media support ([d0a4501](https://github.com/lttb/toned/commit/d0a4501052a4c7a6145ce23d8da289d08b5d4423))
