# SplitSync

SplitSync is an expense splitting app for roommates, a bit like Splitwise. You make a group with your flatmates, add what you paid for, and it works out who owes who.

It's a monorepo with an ASP.NET Core API (`server`) and a React + Vite + TypeScript client (`client`). The database is Postgres.

## Features

- Sign up / sign in (email or username), and delete your account
- Create groups, add members by username, join with a group ID, rename/delete/leave groups, remove members
- Add, edit and delete expenses
- Split expenses equally, unequally ($ amounts) or by percentage, with suggested amounts that auto balance as you type
- Attach a photo of the receipt to an expense, anyone in the group can view it
- Balances per group (who owes you, who you owe) and recording settlements
- Notifications when someone adds an expense, records a settlement with you, adds/removes you from a group or deletes a group
- Group dashboard refreshes itself every 20 seconds, so you see other people's changes without reloading
- Light and dark mode

## What you need

- .NET 10 SDK
- Node 22+ and pnpm

## Running it locally

From this folder, one command starts both the API and the client:

```bash
pnpm install   # only the first time
pnpm dev
```

Or run them in two terminals if you want separate logs:

```bash
# terminal 1: API on http://localhost:5085
cd server
dotnet run

# terminal 2: client on http://localhost:5173
cd client
pnpm dev
```

The client proxies `/api/*` to the API (see `client/vite.config.ts`), so there's no CORS setup needed locally.

To check it's all connected, open `http://localhost:5173` or go to `http://localhost:5085/api/health`, it should return `{ "status": "ok" }`.

## Database and migrations

Locally we all use the same Supabase Postgres database. The connection string goes in user secrets (ask the team for it):

```bash
cd server
dotnet user-secrets set "ConnectionStrings:Default" "<connection string>"
```

Migrations only run by themselves on Render (production). Locally you have to apply them yourself, otherwise you'll get "Something went wrong" errors because the tables/columns won't match the code.

You don't need to install `dotnet-ef`, you can run it with `dnx`. Run these from the `server` folder:

```bash
# apply any new migrations
dnx dotnet-ef@10.0.11 database update

# make a new migration after changing a model
dnx dotnet-ef@10.0.11 migrations add <Name>
```

Since the database is shared, tell the team when you apply a migration.

## Receipt photos

- Only the person who paid for an expense can add, replace or remove its receipt. Everyone in the group can view it.
- Photos get shrunk in the browser before uploading (max 1600px, JPEG), so a normal phone photo ends up a few hundred KB. This also removes location data from the photo.
- The server only accepts JPEG, PNG or WebP up to 5 MB. It checks the actual file bytes, not just the file name.
- Photos are stored in Postgres in their own table (`ExpenseReceipts`), so loading the expense list doesn't pull the images. Render's free tier doesn't keep files on disk between restarts, so saving them as files wasn't an option.
- All the storage code is behind `IReceiptStorage`. If we ever move to something like Cloudinary or S3, we just write a new class for that and change one line in `Program.cs`.

## Tests

Backend tests are in `server.Tests` (xUnit, uses an in-memory database):

```bash
cd server.Tests
dotnet test
```

Frontend tests use Cypress:

```bash
cd client
pnpm test
```

## Folder structure

```
server/         ASP.NET Core Web API
  Controllers/  API endpoints
  Models/       database entities
  Dtos/         request/response shapes
  Services/     token, notifications, receipt storage
  Migrations/   EF Core migrations
server.Tests/   backend tests
client/         React + TypeScript (Vite)
  src/pages/        pages
  src/components/   modals, header, etc.
  src/lib/          API calls, session, theme, image compression
```

## Deploying

`render.yaml` is a [Render Blueprint](https://render.com/docs/blueprint-spec). It sets up everything on Render's free tier: a Postgres database, the API as a Docker web service (`server/Dockerfile`) and the client as a static site.

1. Push to GitHub, then on Render go to **New > Blueprint** and pick the repo. The Blueprint path is `splitsync/render.yaml` since this is a monorepo.
2. It sets the API's connection string and JWT key automatically (`generateValue: true`) and points the client at the API with `VITE_API_URL`.
3. Migrations run automatically when the API starts in production (see `Program.cs`), so you don't need to run anything. Render's free tier has no pre-deploy step, so it happens on startup instead. If there's nothing new it just skips.
4. If you rename the services in `render.yaml`, update `Cors__AllowedOrigin` and `VITE_API_URL` to the new `*.onrender.com` URLs.

Things to know about the free tier:

- The services go to sleep when nobody uses them, so the first request after a while can take around 30 seconds.
- The free Postgres database expires about 30 days after it was created. Check the date in the Render dashboard before a demo.
- The client build uses `pnpm install --frozen-lockfile`, so if you add a package make sure you commit `pnpm-lock.yaml` too, or the deploy fails.

## Known limitations

- For percentage splits we only save the dollar amount per person, not the percentage. So when you edit one, the percentages shown are worked out again from the amounts and might be rounded.
- Each expense can only have one receipt photo.
- No real in-app payments. Settlements are just a record that someone paid, the actual money goes through your bank (e.g. PayID).
