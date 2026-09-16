# Working on Toned

Preserve typed semantic tokens, named parts, chained variant selectors, bitwise
matching and direct style updates. Normalize declarations once and share immutable
plans; mutable state belongs to a mounted controller. React renders must not
publish host writes, subscriptions or pending variants.

Agents should introduce named stylesheet parts and explicit bindings/resolvers,
not new `t()` calls. Keep camelCase token properties and kebab-case named values.
Use `$kind`, `$style` and explicit platform blocks in new examples. Keep aliases
compatible where documented; do not silently normalize distinct token names.

Web CSS is generated before rendering. Never compensate for a missing build input
with runtime stylesheet injection. Backends must diagnose unsupported capabilities.
Native grid remains unavailable until a real integrated host passes conformance.

When embedded in HQ, use its root pnpm installation and isolated Toned test runner;
do not create another React installation. Keep runtime and type regressions beside
the implementation, and update each package README with API changes.
