import { customAlphabet } from 'nanoid';

// Sin caracteres ambiguos (0/O, 1/I/L) para que el codigo se pueda leer y
// escribir a mano si hace falta compartirlo fuera del link. Compartido entre
// Group.inviteCode y User.referralCode: mismo formato para ambos usos.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export const generateShortCode = customAlphabet(ALPHABET, 8);
