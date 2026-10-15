/*
  Warnings:

  - You are about to alter the column `price` on the `Match` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(30,10)`.
  - You are about to alter the column `volume` on the `Match` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(30,10)`.
  - You are about to alter the column `price` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(30,10)`.
  - You are about to alter the column `amount` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(30,8)`.
  - You are about to alter the column `filled` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(30,8)`.
  - You are about to alter the column `btc` on the `Wallet` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(30,8)`.
  - You are about to alter the column `usd` on the `Wallet` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(30,10)`.


  Existing values are converted with 15 significant digits, which drops
  float noise such as 0.30000000000000004, then rounded to the column's
  scale (8 places for BTC, 10 for USD).
*/
-- AlterTable
ALTER TABLE "Match" ALTER COLUMN "price" SET DATA TYPE DECIMAL(30,10),
ALTER COLUMN "volume" SET DATA TYPE DECIMAL(30,10);

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "price" SET DATA TYPE DECIMAL(30,10),
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(30,8),
ALTER COLUMN "filled" SET DATA TYPE DECIMAL(30,8);

-- AlterTable
ALTER TABLE "Wallet" ALTER COLUMN "btc" SET DATA TYPE DECIMAL(30,8),
ALTER COLUMN "usd" SET DATA TYPE DECIMAL(30,10);
