# Stylesheet controllers

Declaration compilation and mounted ownership have different lifetimes.
`StyleMatcher` and the portable plan share immutable declaration work.
`controller-plan.ts` caches the controller's derived metadata by matcher:
relation declarations, native semantic-state vocabulary, condition expressions,
positive container facts, and direction keys. Evaluating it supplies the current
system thresholds, candidate facts and host measurements; none are captured in
the shared metadata.

`Base` is a render candidate. Its modifiers, interaction snapshots, token output
cache and host refs remain local until commit. `prepare(previous)` adopts the
previous `MountedFamily` identity without publishing candidate variants or
changing its current owner. The family contains committed relation topology,
host conditions, validation notifications and subscription ownership.

Families are allocated lazily. Pure resolution, server rendering and disposing
an unused candidate need none; a successor candidate reuses its predecessor's
family instead of constructing and discarding an empty set of host registries.
Candidate token caches and diagnostic sets also allocate only when used.

Commit remains the only place to publish the family owner or start host/media
subscriptions. Ref attachment and detachment preserve generation checks and
queued ownership validation. See [`../hosts/README.md`](../hosts/README.md) for
the host integration lifecycle and [`../core/README.md`](../core/README.md) for
portable declaration compilation.
