/** Mismo patron que el frontend (ver username.util.ts): letras, numeros, espacios, guiones y apostrofes. */
export const USERNAME_PATTERN = /^[\p{L}\p{N} '-]+$/u;
export const USERNAME_PATTERN_MESSAGE = 'Usa solo letras, numeros, espacios, guiones y apostrofes';
