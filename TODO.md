# TODO

Improvements ported from the Library project (`../Library`), which shares this backend template.

## Quick

- [x] Commit the TypeScript 6 upgrade
- [x] Remove the leftover `@rental`, `@book` and `@configs` aliases, add `@exchange/`, rename the Swagger title ("Biblioteca") and fix the `shared.erros.ts` typo
- [x] Move the app setup out of `main.ts` into `app.setup.ts` and build e2e apps with it (`createTestApp`)
- [x] Refuse to start without `JWT_SECRET_KEY` and `JWT_REFRESH_SECRET` of at least 32 characters
- [x] CI: Node 24, `migrate:check`; remove the `postMigration` script
- [x] Production Dockerfile, and fix its path in `.docker/docker-compose.yml`

## Medium

- [ ] Passwords: login takes only a username (`LoginInput`), so anyone who knows a username gets a token. Add a hashed password to users (migration, create and update commands, login check), and keep it out of every user response, like Library's `toUserResponse`
- [ ] Roles: users have no role yet. Add a `role` column (migration and seed), then `RolesGuard` and `@Roles`, and decide which routes are admin-only
- [ ] Ownership checks on the user routes: any logged-in user can update (`PUT /v1/users/:id`) or delete (`DELETE /v1/users/:id`) any other user and list all users, and `GET /v1/users/:id` needs no token at all.
- [x] Run the dev `app` and `frontend` containers as uid/gid 1000 (`HOST_UID`/`HOST_GID`), like Library, so they stop leaving root-owned files (`backend/dist`, `backend/.docker`) in the source folder
- [ ] File-name lint (`eslint-plugin-check-file`): camelCase names plus a role suffix, then rename the files and folders that break it (`paginated-query.request.dto.ts`, `domain-event-publisher/`, `FakeLogger.service.ts`, `DateType.ts`, `test/data-builders/`, …)
- [ ] Route-protection e2e test that fails if a route answers without a token (HTTP routes, plus the Socket.IO gateway)
- [ ] Single-use refresh sessions (`RefreshSession`, rotated `jti`), `tokenVersion` revocation and `POST /v1/logout`, with the frontend's refresh handling
- [ ] Login rate limit per IP and email (`LoginThrottlerGuard`)

## Larger

- [ ] Save the matching results (wallets, matches, orders) in a single Prisma `$transaction`, rechecking each order's `filled` and status with a conditional update (see Library's `BookRentalRepository.rent`)
- [ ] Store money and amounts as `Decimal` instead of `Float` (schema, migration, Zod entities, `getMatches` arithmetic, DTOs, frontend formatting)
- [ ] Real frontend tests with coverage thresholds, and lint, test and build the frontend in CI
