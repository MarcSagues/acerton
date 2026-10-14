import { IsOptional, IsString } from 'class-validator';

/** password solo es obligatoria si la cuenta tiene contraseña (no en cuentas solo-Google) — ver AuthService.deleteAccount. */
export class DeleteAccountDto {
  @IsOptional()
  @IsString()
  password?: string;
}
