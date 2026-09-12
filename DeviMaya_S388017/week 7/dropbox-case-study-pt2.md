# Week 2 — Boundaries & Schema
**System: Dropbox (file storage & sync)**

## BA Track: API Contract, Service Boundaries, Sync vs Async

### API Contract

Protocol: **REST over HTTP** — standard choice, no requirement (no cross-service query needs, no strict typed-contract need) that would justify GraphQL or RPC.

| Method | Path | Notes |
|---|---|---|
| POST | `/v1/uploads/init` | Starts a multipart upload; returns presigned URL(s) + upload session reference. Client uploads directly to blob storage. |
| POST | `/v1/uploads/:id/finish` | Confirms upload completion; creates the `file` record from the pending upload. |
| GET | `/v1/files` | Lists the authenticated user's own files (owner-scoped). |
| GET | `/v1/files/:id` | Fetches file metadata (name, mime type, size, current version). |
| GET | `/v1/files/:id/download` | Returns a presigned URL for direct download from blob storage. |
| DELETE | `/v1/files/:id` | Deletes file — must remove both the blob and the metadata row atomically (no orphaned blob or row). |
| PATCH | `/v1/files/:id/share` | Toggles share status (`{share: true/false}`) — status update on an existing resource, not resource creation, hence PATCH over POST. |
| GET | `/v1/files/:id/share` | Returns the active share link, or 404 (used identically for "not shared" and "doesn't exist," to avoid leaking file existence). |
| GET | `/v1/shared/:token` | **Consumer-side** endpoint for the share-link recipient — unauthenticated, scoped to that one file only. Required because "share via link" is a two-sided feature: the owner grants access, but nothing else in the contract lets the link holder actually use it. |
| POST/PATCH | `/v1/files/:id/revert` | Restores a previous version (`{version}` in body). |
| POST | `/v1/sync` | Device sync — body: `device_id`. Server compares `file.updated_at` against `device.last_synced_at` and returns changed files (presigned URLs) since last sync. |

**Known simplification:** initial upload endpoint design assumes chunking/resumability is handled at the multipart-upload layer (via presigned URLs) rather than fully specified here — deliberate scope cut, not an oversight, made to stay within the interview-format time budget this was first drafted under.

### Service Boundaries

**Components:**
- **Client** — external, but first-party/trusted (runs on the user's device, outside our infrastructure, but is our own application).
- **API (backend)** — internal.
- **RDB (metadata store)** — internal.
- **Blob storage (e.g. R2/S3)** — external, third-party dependency.
- **CDN** — external, third-party; not currently in use (see below).
- **API Gateway / load balancer** — deliberately not included at this stage; no current need for cross-service routing or centralized auth (single backend service). Would become relevant if the system split into multiple backend services, or at a scale requiring traffic distribution across multiple API instances — flagged as a candidate topic for Week 3.

**Trust boundaries** (who can call what):
- **Authenticated owner** — full access to their own resources (upload, list, get, download, delete, share, revert, sync). Enforced via owner-scoped queries (`WHERE user_id = ?`).
- **Anonymous share-link holder** — no account, access scoped to a single file via `/v1/shared/:token` only.

**CDN — parked as a future consideration:** direct-from-blob-storage download is sufficient for v1 (fully satisfies requirements). CDN would improve latency for repeatedly-accessed shared files, at the cost of cache invalidation complexity — mitigated by the fact that versioned download URLs (via `file_version`) make invalidation largely unnecessary, since a new version is naturally a new URL rather than a stale cached one. "Good vs great" framing: direct blob storage is good; CDN is great but not free.

### Sync vs Async

REST is synchronous by default (request/response, connection held until resolved). Async behavior isn't a native REST primitive — it has to be composed on top of it.

- **Upload — the one endpoint that's architecturally async.** Split into `init` → (client-to-blob-storage transfer, outside the API's request/response cycle) → `finish`. Each step is individually a fast, synchronous call; together they simulate async behavior by never holding a connection open across the slow part. This shape is required directly by the Week 1 NFR (resumable, no fixed SLA, since duration depends on client bandwidth).
- **All other endpoints (get, list, delete, share, revert, sync/polling) are synchronous calls** — each is fast and bounded, no reason to complicate them.
- **Polling (`/v1/sync`) is a synchronous call that produces async-*feeling* system behavior** — the client accepts staleness (bounded by the 5s eventual-consistency NFR) rather than getting real-time push. Worth distinguishing explicitly: sync/async at the *call* level (is this one request blocking?) is different from sync/async at the *system behavior* level (does the overall experience feel instant or eventually-consistent?). Polling is sync at the call level, async-feeling at the system level.

**Future deep-dive candidate:** push-based updates (SSE/WebSocket) as a "great" upgrade over polling — trades per-client persistent connection cost for lower latency. Polling already satisfies the stated NFR; push would be a UX enhancement layered on top, not a requirement fix.

---

## DA Track: ER Diagram & Normalization

### Entities & Relationships

- `user` 1 —< `file` (owns)
- `user` 1 —< `device` (owns)
- `file` 1 —< `file_version` (has versions; each version is a distinct blob)
- `file` 1 —0/1 `share_link` (a file may have at most one active share link)
- `device` — **no stored relationship to `file`.** Sync is resolved at query time by comparing `file.updated_at` against `device.last_synced_at`; storing an edge would misrepresent this as a persisted relationship rather than a runtime comparison.

### Schema Notes

- **`file` vs "metadata"**: conceptually, the RDB row represents *metadata* — the actual byte content lives in blob storage, untouched by this table. Named `file` pragmatically for readability, not because the distinction was forgotten.
- **Denormalization**: `file.version` and `file.r2_path` cache the *current* version's pointer/number to avoid a join on every read; `file_version` retains full history (including its own `size`, since versions can differ in size from one another).
- **`share_link.file_id`** is unique, enforcing the one-active-link-per-file cardinality — matches the PATCH-based toggle semantics of the share endpoint.
- **Audit columns** (`created_at/by`, `updated_at/by`, `deleted_at/by`) applied uniformly across all tables, per standing convention.

### ERD

See `dropbox_erd.puml` (PlantUML).

---

## Reflections

- REST has no native async primitive — async behavior for genuinely slow/unbounded operations (large uploads) has to be composed as a sequence of individually-synchronous calls (the "202 Accepted" / two-step pattern), not assumed for free.
- Distinguished **pull** (polling — client-initiated, sync per-call, async-feeling overall) from **push** (SSE/WebSocket — server-initiated, persistent connection, lower latency at a real infra cost) as two different mechanisms for delivering non-instant updates, rather than treating "async" as one undifferentiated bucket.
- Service boundaries aren't just an internal/external components list — the more load-bearing half is defining *trust levels* (who is allowed to call what, and under what identity assumptions), which the API contract had already implicitly answered via the authenticated-owner vs anonymous-share-link split.
- The API contract, ER diagram, and Week 1 requirements stayed mutually consistent throughout — e.g. `file_version` resolving both sync-conflict handling and CDN cache-invalidation concerns, and the security NFR (owner-scoped visibility) mapping directly onto the `GET /v1/files` query filter.
