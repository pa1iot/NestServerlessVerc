import { IsNotEmpty, IsString, IsOptional, IsEnum, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
  USER = 'USER'
}

export class SendOtpDto {
  @ApiProperty({
    description: 'Indian mobile phone number (10 digits starting with 6-9)',
    example: '9876543210',
    pattern: '^[6-9]\\d{9}$'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Phone number must be a valid 10-digit Indian mobile number starting with 6-9'
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'User name (optional for OTP sending)',
    example: 'John Doe',
    required: false
  })
  @IsOptional()
  @IsString()
  name?: string;
}

export class RegisterDto {
  @ApiProperty({
    description: 'Indian mobile phone number (10 digits starting with 6-9)',
    example: '9876543210',
    pattern: '^[6-9]\\d{9}$'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Phone number must be a valid 10-digit Indian mobile number starting with 6-9'
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'Full name of the user (required for registration)',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Indian mobile phone number (10 digits starting with 6-9)',
    example: '9876543210',
    pattern: '^[6-9]\\d{9}$'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Phone number must be a valid 10-digit Indian mobile number starting with 6-9'
  })
  phoneNumber: string;

  @ApiProperty({
    description: '6-digit OTP received via SMS',
    example: '123456',
    pattern: '^\\d{6}$',
    minLength: 6,
    maxLength: 6
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, {
    message: 'OTP must be a 6-digit number'
  })
  otp: string;

  @ApiProperty({
    description: 'User name (optional, for new user registration)',
    example: 'John Doe',
    required: false
  })
  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateUserDto {
  @ApiProperty({
    description: 'Indian mobile phone number (10 digits starting with 6-9)',
    example: '9876543210',
    pattern: '^[6-9]\\d{9}$'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Phone number must be a valid 10-digit Indian mobile number starting with 6-9'
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'User role in the system',
    enum: UserRole,
    example: UserRole.ADMIN,
    enumName: 'UserRole'
  })
  @IsEnum(UserRole)
  role: UserRole;
}

export class UpdateProfileDto {
  @ApiProperty({
    description: 'Updated name for the user',
    example: 'John Doe Updated',
    minLength: 2,
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class AdminCreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Phone number must be a valid 10-digit Indian mobile number starting with 6-9'
  })
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum([UserRole.ADMIN, UserRole.EMPLOYEE])
  @IsNotEmpty()
  role: UserRole;
}