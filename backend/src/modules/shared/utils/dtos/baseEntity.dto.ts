import { ApiProperty } from "@nestjs/swagger";

/** Fields every persisted record exposes in API responses. */
export class BaseEntityDto {
  @ApiProperty({
    description: "Identificador do registro",
    format: "uuid",
    example: "3f2b9c1e-8d47-4a6b-9e0f-5c1d2a7b8e64",
  })
  id!: string;

  @ApiProperty({
    description: "Momento em que o registro foi criado",
    type: String,
    format: "date-time",
    example: "2026-01-15T13:45:00.000Z",
  })
  createdAt?: string | Date;

  @ApiProperty({
    description: "Momento da última alteração do registro",
    type: String,
    format: "date-time",
    example: "2026-02-03T09:10:00.000Z",
  })
  updatedAt?: string | Date;
}
