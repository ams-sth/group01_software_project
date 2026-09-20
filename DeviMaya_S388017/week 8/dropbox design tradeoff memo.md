# Week 3 — Trade-off Memo
**System: Dropbox (file storage & sync)**

This memo covers design decisions flagged during Week 2's boundary/schema work and deliberately deferred at the time. Each is assessed on cost, latency, and risk implications, per the milestone brief.

---

## 1. CDN vs Direct Blob Storage

**Decision: Direct blob storage for v1. CDN is a deliberate, conditional future upgrade — not a default assumption.**

**Technological feasibility:** Blob storage remains the source of truth regardless of this decision. A CDN sits in front of it as a **pull-based (lazy) cache** — the first request to an edge is a cache miss and triggers a fetch from origin; subsequent requests to that edge are served from cache until evicted or invalidated. No explicit "upload to CDN" step is required. (Push/pre-warming exists as an alternative pattern for known-viral content, but isn't the default and isn't needed here.)

**Benefit:** Not primarily geography — the headline benefit is spreading read traffic off a single origin, which is load-balancing-*shaped* in effect (though mechanistically distinct from compute load balancing: CDN distributes cached-read traffic, not write/compute traffic). This benefit only materializes under **fan-out** — many requests for the same file. This maps directly onto the share-link feature; private, single-owner files gain little to nothing from CDN, since there's no repeat access to cache against. Geography is a secondary multiplier on top of fan-out, not the primary driver.

**Cost:**
- *Monetary*: bandwidth/egress (dominant cost, scales with popularity of content served, not total storage), origin-fetch cost on cache misses, per-request charges, invalidation-call charges at volume. A low cache-hit-rate deployment can cost *more* than no CDN at all — paying both blob storage egress and CDN markup for the same bytes, with none of the caching benefit.
- *Technical*: one more component to operate and reason about, plus the invalidation risk below.

**Risk:** Cache invalidation — a changed or deleted file can be served stale from an edge that hasn't caught up, and actively invalidating on every mutation is fragile (requires remembering to call purge on every code path; doesn't propagate instantly; a missed call anywhere silently reintroduces staleness). **Resolved by design, not by process**: versioned/immutable content URLs (already present via the `file_version` entity) mean cached bytes are never mutated, only superseded — a new version is a new URL, so there is nothing to invalidate. Metadata (which version is current) is always a live, uncached DB read; only immutable, versioned bytes are ever cached. This is the standard real-world pattern for this exact class of problem, not a workaround specific to this design.

**Refinement:** The hot-spot/celebrity problem (a small number of files receiving disproportionate traffic) suggests CDN adoption doesn't need to be a binary, system-wide switch. TTL-based natural decay lets popular files organically accumulate cache hits while unpopular files fall out of cache at near-zero cost, without needing explicit access-count-threshold logic.

---

## 2. Sync Delivery: Polling vs SSE (Server-Sent Events)

**Decision: Polling for v1. SSE is a credible v2 target, adopted alongside — not instead of — polling as a fallback.**

**Baseline:** Polling already satisfies the stated NFR (eventual consistency within 5s). SSE is therefore a UX/efficiency upgrade, not a requirement fix.

**Cost:**
- *Infrastructure*: server capacity must be planned around concurrent open connections, a different scaling axis than request throughput. Load balancers/proxies typically need explicit configuration to permit long-lived connections without buffering or premature idle timeouts. At more than one API instance, a pub/sub layer (e.g. Redis pub/sub) is typically needed so any instance handling a write can notify whichever instance holds the relevant client's connection.
- *Engineering*: reconnect handling and event-level observability aren't automatic. (Note: browser-native `EventSource` provides automatic reconnection — reconnect failures in practice usually trace to not using `EventSource` correctly, e.g. hand-rolling over raw `fetch()`, rather than a fundamental SSE limitation.)
- *Network dependency, outside application control*: SSE relies on every intermediary between client and server (proxies, some CDNs, some load balancers) correctly supporting long-lived streaming responses. Middlebox buffering — an intermediary batching the response instead of streaming it — can silently break SSE with no fix available at the application layer. This is the real basis for treating SSE as less reliable than polling: not a flaw in the protocol (SSE is a legitimate, standardized use of HTTP/1.1 chunked transfer encoding, not a hack), but a dependency on infrastructure the application doesn't own or control.

**Benefit:**
- Lower latency (near-instant vs. up to 5s staleness) and better perceived responsiveness.
- Eliminates redundant "anything new?" requests when nothing has changed — this is a *structural* fix, not just an efficiency gain: it collapses **query volume** (a scaling dimension the indexing fix below does not address) to only the moments something actually changed, rather than one query per poll interval per device regardless of activity.
- Broad, long-standing browser support (`EventSource`), no polyfills needed.

**Recommended pattern for v2, if adopted:** SSE as primary; polling as a conditional fallback (not running in parallel with a healthy SSE connection) for clients where SSE fails to connect or drops without reconnecting. This confines the query-volume problem to the fallback subset of clients rather than the whole user base.

---

## 3. Sync Stale-Check Mechanism (Full Scan)

**Decision: Add a composite index on `(user_id, updated_at)`. No structural redesign at this time.**

The original mechanism (scan all of a user's files, compare `updated_at` to `device.last_synced_at`) was flagged in Week 2 as not scaling with file count. On inspection, the underlying comparison logic is correct — the issue is querying without an index, forcing a full scan instead of a bounded range lookup.

**Fix:** An index on `(user_id, updated_at)` turns the query into a fast range scan bounded by *changes since last sync*, not total file count. This resolves per-query cost cheaply, without changing the data model.

**What this does not resolve:** query **volume**. Total request throughput to the DB scales with (users × devices × poll frequency), independent of how cheap any individual query is — this is a separate scaling dimension from per-query cost, and indexing does not touch it. This is a known, deliberately deferred concern (see SSE above, which is the identified structural fix — SSE eliminates unnecessary polling entirely, rather than optimizing each poll), not an unaddressed risk being ignored.

**A dedicated change-log table** (append-only record of what changed, when) was considered as a further option but not adopted — there's no evidence the indexed approach is insufficient, and it adds structural complexity for a benefit not yet needed.

---

## 4. API Gateway (footnote)

Not adopted for v1 — a single backend service has no need for cross-service routing, and auth/rate-limiting can live directly in the one API service for now.

Two points worth flagging for later:
- **Risk to future SSE adoption**: if a gateway is introduced later, it must be explicitly verified to support long-lived streaming connections without buffering — an unrelated infra addition (e.g. for auth) could silently break SSE if this isn't checked, the same class of risk as any other hop in the request path.
- **Adoption trigger**: becomes genuinely valuable once there are multiple backend services to route between, or a need for centralized auth/rate-limiting across multiple client surfaces — not a "best practice, add by default" component.

---

## Summary Table

| Decision | v1 Choice | Deferred Alternative | Trigger to Revisit |
|---|---|---|---|
| File serving | Direct blob storage | CDN | High fan-out / repeated access on shared files starts to matter |
| Sync delivery | Polling | SSE (+ polling fallback) | Query volume or latency becomes a real problem at scale |
| Stale-check query | Indexed range scan | Change-log table | Indexed approach proves insufficient at scale |
| Request routing/auth | In-service | API Gateway | Multiple backend services, or need for centralized cross-surface policy |
