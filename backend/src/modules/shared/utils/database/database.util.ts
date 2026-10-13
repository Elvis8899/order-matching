import { BaseDateEntity } from "@shared/utils/domain/dateEntity.base";

export const removeEntityDates = <U extends BaseDateEntity>(entity: U) => {
  const { createdAt: _, updatedAt: __, ...entityWithoutDates } = entity;
  return entityWithoutDates;
};
