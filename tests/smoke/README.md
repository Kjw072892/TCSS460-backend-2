# Smoke Tests — Postman Collection

End-to-end smoke tests for backend-2. Covers `/auth/dev-login`, public GETs,
authed writes, ownership enforcement, and admin override on both `v1` (raw SQL)
and `v2` (Prisma) routes.

## Files

- `backend-2-smoke.postman_collection.json` — the collection
- `backend-2-smoke.postman_environment.json` — environment (baseUrl + token
  slots). Token values are set at runtime by the Setup folder's test scripts.

## Prerequisites

1. PostgreSQL running (`docker compose up -d` from repo root)
2. Migrations applied and seed run (`npm run db:setup` once, then
   `npm run prisma:seed` to refresh). The seed creates an `admin` user that
   the admin-override tests depend on.
3. Server running: `npm run dev`

## Run it — Postman app

1. Import both files (`Import` button → select both JSON files)
2. Select the `backend-2 local` environment from the env dropdown (top right)
3. Open the collection → `Run collection`
4. Order matters — keep the default order. Later requests depend on tokens
   and `v{1,2}MsgId` captured by earlier ones.

## Run it — Newman (CLI)

```bash
npx newman run tests/smoke/backend-2-smoke.postman_collection.json \
  -e tests/smoke/backend-2-smoke.postman_environment.json
```

Exit code is non-zero if any assertion fails — useful for CI.

## What it covers

| Folder | What it proves |
|---|---|
| 0 — Setup | `/auth/dev-login` mints tokens; JWT `role` claim is correct for user vs. admin; missing username → 400 |
| 1 — Public GETs | List and single-resource GETs don't require auth; bad id → 400 |
| 2 — Messages v2 | POST without token → 401; bad token → 401; authed POST → 201 with `authorId` = JWT `sub`; owner PATCH → 200; non-owner PATCH/DELETE → 403; admin DELETE override → 200; re-delete → 404 |
| 3 — Messages v1 | Same flow against the raw-SQL path |
| 4 — Users | Public list and `POST /v1/users` (idempotent across runs via a timestamp suffix) |

## Resetting between runs

`v{1,2}MsgId` are cleared each run (the Setup → POST requests re-create them).
If the server was restarted and the DB was reseeded, every run starts clean.

If you're seeing stale data and want a hard reset:

```bash
npm run prisma:reset   # drops + re-migrates + re-seeds
```
