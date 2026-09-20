# Week 3 — Database Selection Note
**System: Dropbox (file storage & sync)**

## Framing

The data managed by the app splits into two categories with different storage needs:
- **Blob content** (actual file bytes) — stored in object storage (e.g. S3/R2). This isn't a database question at all — object storage has no query language, schema, or transactions; it's a key-value store for arbitrary bytes, used by necessity for large binary content, not chosen as an alternative to a database.
- **Metadata** (`file`, `file_version`, `user`, `device`, `share_link`) — this is the actual database decision below.

The approach taken: rather than defaulting to RDB or reaching for NoSQL, each common NoSQL category was checked against the specific problem it's built to solve, to see whether that problem actually exists in this system.

## Database Selection: RDB vs NoSQL

**Decision: RDB for the metadata layer.**

| NoSQL category | Problem it solves | Present in this system? |
|---|---|---|
| Key/value (e.g. Redis) | Expensive, frequently-repeated reads that benefit from an in-memory cache | No — metadata lookups are already fast, indexed primary-key reads (see Indexing below); caching an already-cheap query adds a second moving part (cache/source consistency, TTL tuning, another service to operate) without removing a real bottleneck |
| Document DB | Variable or unstructured record shape across the collection | No — every metadata record (file, user, device, etc.) has the same fixed shape |
| Search engine (e.g. Elasticsearch) | Full-text / content search | No — no FR requires searching file *contents*; filtering by structured metadata fields is handled by ordinary indexed RDB queries |

None of the three applies. Metadata is small, fixed-shape, and relational (file → file_version, file → user, etc.) — exactly what an RDB is built for, with no scaling or flexibility need forcing a deviation from it.

**Redis considered separately, for caching (not persistent storage):** proposed as a cache in front of hot metadata reads, given the hot-spot/celebrity pattern already identified for the CDN discussion. Rejected on the same reasoning as above — the underlying read is already a fast indexed lookup, so there's no real bottleneck to amortize the added operational cost against.

## Indexing

Derived by walking each query pattern and asking whether it filters/sorts by a non-primary-key column frequently enough, and selectively enough, to justify the write-time cost of maintaining an index.

| Index | Table / Columns | Reasoning |
|---|---|---|
| Composite | `file (user_id, updated_at)` | Serves two access patterns with one index: (1) sync — "what changed since last_synced_at" for a given user; (2) file list — "show this user's files, most recent first." Composite index provides both the filter (`user_id`) and the sort order (`updated_at`) without a separate index for each. |
| Single-column | `share_link (token)` | The share-consumption endpoint (`GET /v1/shared/:token`) is unauthenticated and looks up by `token`, not by primary key. Without this index, that lookup would require a full table scan. |
| Single-column | `file_version (file_id)` | Version history and revert both filter by `file_id`. Note: foreign key columns are not automatically indexed by every database (e.g. Postgres does not auto-index FKs, unlike MySQL/InnoDB) — this has to be added deliberately, not assumed to come free with the relationship. |
| — (none added) | `device` | Only ever looked up by its own primary key (`id`) during sync — already indexed by default. No query pattern lists devices by `user_id`, since device management is out of v1 scope. Adding an index here would be write-time cost for a lookup pattern that doesn't exist. |

**General principle applied throughout:** an index trades write-time cost (every write to the table must also update the index) and storage for faster, ordered reads on a specific column. Worth adding when a column is queried frequently and narrows results well (as with the three above); not worth adding reflexively on every table or every foreign key (as with `device`).

## Caching (cross-reference)

Caching for this system was resolved primarily during the CDN trade-off discussion (see trade-off memo): CDN caches immutable, versioned blob content at the edge (justified by fan-out on shared files); Redis-based metadata caching was considered and rejected for the reason given above. No additional caching layer identified as necessary for v1.
