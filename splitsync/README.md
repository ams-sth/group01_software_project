# SplitSync

Expense-splitting PWA for roommates. Monorepo: ASP.NET Core API (`server`) + React/Vite/TS client (`client`).

## Prerequisites

- .NET 10 SDK
- Node 22+ with pnpm

## Run

From the repo root, one command starts both:

```bash
pnpm install   # first time only, installs the root dev-orchestration tooling
pnpm dev
```

Or run them separately in two terminals, if you want independent control/logs:

```bash
# terminal 1 — API (http://localhost:5085)
cd server
dotnet run

# terminal 2 — client (http://localhost:5173)
cd client
pnpm dev
```

The client dev server proxies `/api/*` to the API (see `client/vite.config.ts`), so fetch calls from React can just hit `/api/...` with no CORS setup needed.

Check the wire-up: visit `http://localhost:5173`, then hit `http://localhost:5085/api/health` directly, or add a fetch to `/api/health` in the client and confirm `{ "status": "ok" }` comes back through the proxy.

## Structure

```
server/   ASP.NET Core Web API (controllers)
client/   React + TypeScript (Vite)
```

## Deploy

`render.yaml` is a [Render Blueprint](https://render.com/docs/blueprint-spec) that provisions everything on Render's free tier: a Postgres database, the API as a Docker web service (`server/Dockerfile`), and the client as a static site.

1. Push this repo to GitHub, then on Render: **New > Blueprint**, point it at the repo (Blueprint path: `splitsync/render.yaml`, since this is a monorepo). Render reads it and creates all three resources.
2. It wires up the API's connection string and JWT signing key automatically (`generateValue: true`), and points the client at the API via `VITE_API_URL`.
3. EF Core migrations run automatically on boot in Production (see `Program.cs`) — no manual `dotnet ef database update` needed. Render's free tier doesn't support a separate pre-deploy step, so this happens inline on every startup instead; it's a no-op once the schema is up to date.
4. If you rename the services in `render.yaml`, update the `Cors__AllowedOrigin` and `VITE_API_URL` values to match the new `*.onrender.com` URLs.

Free-tier services spin down after inactivity, so the first request after idling can take ~30s to wake up.
