import { IsLatitude, IsLongitude, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TrackDeviceDto {
  @IsLatitude()
  lat: string;

  @IsLongitude()
  long: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  altitude?: string;

  @IsOptional()
  @IsString()
  speed?: string;

  @IsOptional()
  @IsString()
  compress?: string;

  @IsOptional()
  @IsString()
  weight?: string;

  @IsOptional()
  @IsString()
  noOfSatellites?: string;
}
