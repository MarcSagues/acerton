import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { USERNAME_PATTERN, USERNAME_PATTERN_MESSAGE } from '../username.util';

export class UpdateNameDto {
  @IsString()
  @MinLength(2)
  @MaxLength(24)
  @Matches(USERNAME_PATTERN, { message: USERNAME_PATTERN_MESSAGE })
  name!: string;
}
