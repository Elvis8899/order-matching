# Exchange App

**Backend** ![Branches](https://github.com/Elvis8899/order-matching/blob/badges/badges/backend/coverage-branches.svg) ![Functions](https://github.com/Elvis8899/order-matching/blob/badges/badges/backend/coverage-functions.svg) ![Lines](https://github.com/Elvis8899/order-matching/blob/badges/badges/backend/coverage-lines.svg) ![Statements](https://github.com/Elvis8899/order-matching/blob/badges/badges/backend/coverage-statements.svg) ![Coverage total](https://github.com/Elvis8899/order-matching/blob/badges/badges/backend/coverage-total.svg)

**Frontend** ![Branches](https://github.com/Elvis8899/order-matching/blob/badges/badges/frontend/coverage-branches.svg) ![Functions](https://github.com/Elvis8899/order-matching/blob/badges/badges/frontend/coverage-functions.svg) ![Lines](https://github.com/Elvis8899/order-matching/blob/badges/badges/frontend/coverage-lines.svg) ![Statements](https://github.com/Elvis8899/order-matching/blob/badges/badges/frontend/coverage-statements.svg) ![Coverage total](https://github.com/Elvis8899/order-matching/blob/badges/badges/frontend/coverage-total.svg)

A BTC/USD exchange with an order-matching backend. Each new order goes to a BullMQ queue on Redis, and a single worker matches orders one at a time against the best-priced orders on the other side, filling them fully or partially, moving funds between both wallets and recording each match. Clients see order, balance and market-statistics updates in real time over Socket.IO.

| App | Stack |
|---|---|
| [`backend`](backend/) | NestJS on Fastify, CQRS with fp-ts, Prisma + PostgreSQL, BullMQ + Redis, Socket.IO, Zod, JWT |
| [`frontend`](frontend/) | React with the Context API, Socket.IO client, Vite, Vitest |

## Features

- Users can login and view their current balance
- Users can place buy/sell orders for BTC
- The app displays real-time updates for orders and balance changes
- The app displays statistics for the current market

## Components

- `Login`: A login form that allows users to enter their username and password
- `Exchange`: The main exchange page that displays the current balance, order form, and market statistics
- `Sonner`: A toaster component that displays success/error messages

## Context API

The app uses the Context API to manage state. The context is defined in the `ExchangeContext` file, and it includes the following values:

- `user`: The current user object
- `balance`: The current user balance
- `orders`: An array of current orders
- `statistics`: An object containing the current market statistics

## Socket.IO

The app uses Socket.IO to receive real-time updates for orders and balance changes. The socket is defined in the `ExchangeProvider` file, and it listens for the following events:

- `match-created`: Sent when an order is executed, receives new global statistics

## Authentication

- Logging in with a new username signs it up (`POST /v1/users`, always as a client). Passwords need 8 to 72 characters and are stored as bcrypt hashes.
- Users are `admin` or `client`. Only admins list users or change roles; clients can read, update and delete only their own account. Someone else's account is reported as not found.
- Login returns an access token and a single-use refresh token. The frontend refreshes on a 401 and retries, one refresh at a time across tabs. `POST /v1/logout` and any user update revoke the user's refresh tokens.
- `POST /v1/login` is rate-limited per client IP and username (`LOGIN_RATE_LIMIT`, `LOGIN_RATE_WINDOW_SECONDS`; `TRUST_PROXY` behind nginx).
- Every route except login, refresh, sign-up and `GET /check/status` needs a token, and so does the Socket.IO connection. `backend/test/modules/auth/routeProtection.e2e-spec.ts` fails if another route answers without one.
- The seed (`yarn migrate:reset` in `backend/`) creates `admin` / `admin123` and `cliente` / `cliente123`.

## Running Project

To run the project, you need to have Docker installed and run the following command:

```bash
docker compose --file .docker/docker-compose-dev.yml up --build -d
```

Alternatively, if you have Make installed, you can run the following command:

```bash
make dockerDev
```

## Credits

The backend's architecture builds on two MIT-licensed projects:

- [Domain-Driven Hexagon](https://github.com/Sairyss/domain-driven-hexagon) by Sairyss: the hexagonal module layout, repository ports and paginated queries.
- [nest-clean-architecture](https://github.com/VincentJouanne/nest-clean-architecture) by Vincent Jouanne: the fp-ts approach to commands and queries, and the `perform`, `validateWith`, `handleLog` and `executeTask` helpers, adapted here to Zod and `ReaderTaskEither`.
