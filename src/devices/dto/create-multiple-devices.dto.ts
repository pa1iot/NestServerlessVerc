import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMultipleDevicesDto {
  @ApiProperty({
    description: 'Number of devices to create',
    minimum: 1,
    example: 5,
  })
  @IsInt()
  @Min(1)
  count: number;
}
