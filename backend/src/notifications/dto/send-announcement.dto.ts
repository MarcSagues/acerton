import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Cuerpo de POST /dashboard/send-notification (ver DashboardNotificationsController). */
export class SendAnnouncementDto {
  /** Titulo corto: en iOS/Android se recorta pasados unos 40-65 caracteres. */
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(65)
  title!: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  body!: string;

  /** true: no envia nada, solo devuelve a cuantos usuarios/dispositivos llegaria. */
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
