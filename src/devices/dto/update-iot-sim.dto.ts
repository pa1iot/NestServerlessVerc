import { IsString, IsNumberString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateIotSimDto {
  @ApiProperty({
    example: 'ABC123XYZ',
    description: 'Unique code identifying the device',
  })
  @IsString()
  code: string;

  @ApiProperty({
    example: '1234567890123',
    description: '13-digit IoT SIM number (stored as string)',
  })
  @IsNumberString({ no_symbols: true }, { message: 'SIM number must be numeric only' })
  @Length(13, 13, { message: 'IoT SIM number must be exactly 13 digits' })
  iotSimNumber: string;
}
