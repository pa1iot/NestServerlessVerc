// export class AssignDeviceDto {
//   code: string;
//   userId: number;
// }

// assign-device.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsInt, IsOptional } from 'class-validator';

export class AssignDeviceDto {
  @ApiProperty({ example: 'DEV12345678', description: 'Device code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 1, description: 'User ID' })
  @IsInt()
  userId: number;

  @IsOptional()
  @IsString()
  deviceName?: string;
}