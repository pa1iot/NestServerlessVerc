import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDeviceNameDto {
  @ApiProperty({ example: 'DEV12345', description: 'Unique code of the device' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'My Device Name', description: 'New name for the device' })
  @IsString()
  @IsNotEmpty()
  deviceName: string;
}
