import { IsOptional, IsString, IsInt, IsIn } from 'class-validator';

export class CreateDeviceDto {
  @IsString()
  code: string;

  @IsString()
  qrCodeUrl: string;

  @IsOptional()
  @IsInt()
  assignedTo?: number;

  @IsOptional()
  assignedAt?: Date;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;
}
