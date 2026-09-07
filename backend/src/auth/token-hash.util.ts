import { createHash } from 'crypto';

/**
 * Los refresh tokens son JWT largos y de alta entropia: usamos SHA-256 en
 * vez de bcrypt para no depender del limite de 72 bytes de bcrypt y porque
 * no necesitamos proteccion contra fuerza bruta (el valor original ya es
 * impredecible), solo evitar que un volcado de la tabla permita reutilizar
 * tokens tal cual.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
