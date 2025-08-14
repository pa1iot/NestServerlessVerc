import { IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserNameDto {
  @ApiProperty({ example: 7, description: 'User ID' })
  @IsNumber()
  id: number;

  @ApiProperty({ example: 'Deepak Kumar', description: 'New user name' })
  @IsString()
  name: string;
}
