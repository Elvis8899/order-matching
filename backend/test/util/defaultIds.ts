export enum TableNameEnum {
  User = "User",
  Wallet = "Wallet",
  Order = "Order",
  Match = "Match",
  None = "None",
}

export const defaultIdPrefixEnum: Record<TableNameEnum, string> = {
  [TableNameEnum.User]: "00000000-0000-0000-0001-",
  [TableNameEnum.Wallet]: "00000000-0000-0000-0001-",
  [TableNameEnum.Order]: "00000000-0000-0000-0002-",
  [TableNameEnum.Match]: "00000000-0000-0000-0003-",
  [TableNameEnum.None]: "99999999-0000-0000-0000-",
};

export const createTestId = (prefix: TableNameEnum, index: number) =>
  defaultIdPrefixEnum[prefix] + (index * 1e-12).toFixed(12).replace("0.", "");
