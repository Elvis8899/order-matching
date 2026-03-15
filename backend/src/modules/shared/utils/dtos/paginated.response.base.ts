import { ApiProperty } from "@nestjs/swagger";
import { Paginated } from "@shared/utils/database/repository.port";

export abstract class PaginatedResponseDto<T> extends Paginated<T> {
  @ApiProperty({
    example: 5312,
    description: "Total number of items",
  })
  count!: number;

  @ApiProperty({
    example: 10,
    description: "Number of items per page",
  })
  limit!: number;

  @ApiProperty({ example: 0, description: "Page number" })
  page!: number;

  @ApiProperty({ isArray: true })
  abstract data: T[];
}
