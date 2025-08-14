import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class ShareDeviceDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  deviceId: number;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  mobile: string;
}