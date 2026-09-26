# Stylesheet controllers

Declaration compilation and mounted ownership have different lifetimes.
`StyleMatcher` and the portable plan share immutable declaration work.
`controller-plan.ts` caches the controller's derived metadata by matcher:
relation declarations, native semantic-state vocabulary, condition expressions,
positive container facts, and direction keys. Evaluating it supplies the current
system thresholds, candidate facts and host measurements; none are captured in
the shared metadata.

`Base` is a render candidate. Its modifiers, interaction snapshots and host refs
remain local until commit. `prepare(previous)` adopts the
previous `MountedFamily` identity without publishing candidate variants or
changing its current owner. The family contains committed relation topology,
host conditions, validation notifications and subscription ownership.

Families are allocated lazily. Pure resolution, server rendering and disposing
an unused candidate need none; a successor candidate reuses its predecessor's
family instead of constructing and discarding an empty set of host registries.
Candidate token caches and diagnostic sets also allocate only when used.
Successor candidates can share immutable token outputs with their predecessor
when the declaration, certified token snapshot, backend, modes and bridge mapping
agree. The cache has at most one weak declaration index per known part (plus the
part-independent entry), never a history of mutable candidate state. Legacy
mutable token objects are resolved afresh by successor candidates. Opaque theme
values prevent certification; CSS-variable references are a locally constructed,
certified immutable proxy.

Commit remains the only place to publish the family owner or start host/media
subscriptions. Ref attachment and detachment preserve generation checks and
queued ownership validation. See [`../hosts/README.md`](../hosts/README.md) for
the host integration lifecycle and [`../core/README.md`](../core/README.md) for
portable declaration compilation.


## Update work and cache bounds

The matcher compiles a fact-to-part dependency index. Direct updates visit only
parts affected by changed facts, including the atoms of composite media/container
conditions. An originating repeated host still reconciles its own interaction
when the aggregate boolean did not change. This keeps local state exchanges and
cross-part relationships correct without resolving unrelated hosts.

Container metadata records each part's referenced names. React subscribes only
those names; unrelated or shadowed measurements stay silent. A subscriber owns
its previous snapshot, so speculative reads cannot consume a notification.
Simple local web relation selectors filter mutation/event delivery by the live
registered hosts. Arbitrary/pseudo selectors retain document-wide notification;
radio groups and select options remain conservative because another choice can
change their state. A document still owns one observer, and unchanged attribute
interests do not disconnect/reconnect it.

The host writer fast-paths one owner and weakly caches normalized contributions
only for certified immutable outputs. Mutable caller requests are read again.
Per-owner combined output caching retains one slot; class parsing retains at
most 64 strings of at most 4,096 characters, bypassing the cache for larger input.
The final differential writer always runs: external baselines, ref handoffs,
owner removal, and the motion interceptor keep their established authority.
These optimizations do not skip commit-time reconciliation or publish styles
from a speculative render.
