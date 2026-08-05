# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
