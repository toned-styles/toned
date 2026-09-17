# Host lifecycle boundary

The controller treats attached targets as opaque identities. `HostIntegration`
supplies committed parent/state reads, topology and viewport subscriptions,
liveness, attachment, and post-attachment validation. It never returns CSS
selectors or renderer nodes to the evaluator.

`dom.ts` owns DOM parent traversal, state selectors, shared document observers,
shared media emitters, and grid registration. `native.ts` validates the explicit
native adapter's topology/state/viewport capabilities and delegates to that
integration. Constructing either adapter is pure; subscriptions begin only when
a controller commits and are released during disposal. Writer ownership remains
in the shared `stylesheet/applyStyles.ts` registry, which selects the registered
native patch adapter or the DOM writer behind its target-based API.

Attachment may receive an `invalidate(target)` callback for local ownership
dependencies. The DOM grid adapter calls it for retained area children when
their owner detaches: a forwarded parent ref can move while those child refs
remain unchanged. Controllers queue attached or invalidated targets and expose
`validatePendingHosts()` to flush them after all commit refs have attached.
The first pending entry advances a monotonic revision and notifies committed
subscribers. React's `createElements` mounts one hostless validation observer per
scope: it subscribes with `useSyncExternalStore` and drains the queue in an effect.
This also catches a custom host moving its own forwarded ref through internal
state, even when no provider or part renders. Only the observer rerenders, and
validation errors reach the React error boundary above the scope. Full provider
validation also drains the entries it checks. Flushing does not advance the
revision or notify again. Detached ref cleanup removes only its own pending
generation; detached grid children have no binding and validate as a no-op.

Relations keep their portable registered-part semantics in `PartRelations`.
Host topology supplies the facts; it does not alter source-order resolution,
instance boundaries, or event-state ownership. Hover, active, and focus facts
come from committed events rather than a selector reread.

Native contract fixtures prove this boundary with opaque targets whose DOM
accessors throw. They do not certify a concrete React Native renderer; that
integration still owns the native commit/reset conformance evidence documented
in `../../toned-react/NATIVE-HOSTS.md`.
