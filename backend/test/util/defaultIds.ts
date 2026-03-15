export enum TableNameEnum {
  User = "User",
  BookInfo = "BookInfo",
  BookItem = "BookItem",
  BookRentalDetails = "BookRentalDetails",
  None = "None",
}

export const defaultIdPrefixEnum: Record<TableNameEnum, string> = {
  [TableNameEnum.User]: "00000000-0000-0000-0001-",
  [TableNameEnum.BookInfo]: "00000000-0000-0000-0002-",
  [TableNameEnum.BookItem]: "00000000-0000-0000-0003-",
  [TableNameEnum.BookRentalDetails]: "00000000-0000-0000-0004-",
  [TableNameEnum.None]: "99999999-0000-0000-0000-",
};

export const createTestId = (prefix: TableNameEnum, index: number) =>
  defaultIdPrefixEnum[prefix] + (index * 1e-12).toFixed(12).replace("0.", "");
