import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { USERNAME_PATTERN, USERNAME_PATTERN_MESSAGE } from '../../users/username.util';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contrasena debe tener al menos 8 caracteres' })
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(24)
  @Matches(USERNAME_PATTERN, { message: USERNAME_PATTERN_MESSAGE })
  name!: string;
}
