import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class AuthDto {
    @IsNotEmpty()
    @IsString()
    @IsEmail()
    public email: string;

    @IsNotEmpty()
    @IsString()
    @Length(6, 20, { message: 'Password must be between 6 to 20 characters' })
    public password: string;
}