import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Letras (con acentos), numeros, espacios, guiones y apostrofes — cubre nombres reales sin dejar pasar simbolos raros. */
const USERNAME_PATTERN = /^[\p{L}\p{N} '-]+$/u;

/** Nucleo reutilizable tanto por el ValidatorFn de forms reactivos como por el chequeo directo sobre un string (ver profile-page, que usa un signal en vez de un FormControl). */
export function validateUsername(raw: string): ValidationErrors | null {
  const value = raw.trim();
  if (!value) return null; // el required se valida por separado

  if (value.length < 2) return { usernameTooShort: true };
  if (value.length > 24) return { usernameTooLong: true };
  if (raw !== value) return { usernameEdgeSpaces: true };
  if (/\s{2,}/.test(value)) return { usernameDoubleSpace: true };
  if (!USERNAME_PATTERN.test(value)) return { usernameInvalidChars: true };
  return null;
}

export function usernameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => validateUsername(control.value ?? '');
}

/** Mensaje user-friendly para el primer error activo, o null si no hay ninguno. */
export function usernameHint(errors: ValidationErrors | null): string | null {
  if (!errors) return null;
  if (errors['required']) return 'Escribe un nombre de usuario';
  if (errors['usernameTooShort']) return 'Mínimo 2 caracteres';
  if (errors['usernameTooLong']) return 'Máximo 24 caracteres';
  if (errors['usernameEdgeSpaces']) return 'No empieces ni termines con espacios';
  if (errors['usernameDoubleSpace']) return 'Sin espacios dobles seguidos';
  if (errors['usernameInvalidChars']) return 'Usa solo letras, números, espacios, guiones y apostrofes';
  return null;
}
