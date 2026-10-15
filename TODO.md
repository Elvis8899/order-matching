# TODO

Improvements ported from the Library project (`../Library`), which shares this backend template.

## Larger

- [x] Save the matching results (wallets, matches, orders) in a single Prisma `$transaction`, rechecking each order's `filled` and status with a conditional update (see Library's `BookRentalRepository.rent`)
- [ ] Store money and amounts as `Decimal` instead of `Float` (schema, migration, Zod entities, `getMatches` arithmetic, DTOs, frontend formatting)
- [x] Real frontend tests, then coverage thresholds (100%)
