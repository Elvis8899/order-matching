import { ApiProperty } from "@nestjs/swagger";

export class PaginatedQueryRequestDto {
  @ApiProperty({
    example: 10,
    description: "Specifies a limit of returned records",
    minimum: 0,
    maximum: 1000,
    required: false,
  })
  readonly limit?: number;

  @ApiProperty({
    example: 0,
    minimum: 0,
    maximum: 1000,
    description: "Page number",
    required: false,
  })
  readonly page?: number;
}
