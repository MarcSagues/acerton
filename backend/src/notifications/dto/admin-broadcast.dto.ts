import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Tope de destinatarios explicitos por peticion (para "todos" se omite `userIds`). */
export const ADMIN_BROADCAST_MAX_USER_IDS = 5000;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class AdminBroadcastDto {
  /** Titulo de la notificacion; los sistemas operativos lo recortan pasados ~65 caracteres. */
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

  /**
   * Destinatarios concretos. Omitido = todos los usuarios. Una lista vacia se
   * rechaza a proposito: un "audiencia vacia" nunca debe acabar leyendose
   * como "todos".
   */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ADMIN_BROADCAST_MAX_USER_IDS)
  @ArrayUnique()
  @IsString({ each: true })
  userIds?: string[];

  /** true = solo calcula a cuanta gente llegaria, sin enviar ni guardar nada. */
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
