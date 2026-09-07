import { IsString, MinLength } from 'class-validator';

export class RegisterNotificationTokenDto {
  @IsString()
  @MinLength(10)
  token!: string;
}
