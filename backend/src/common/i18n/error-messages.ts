import { Locale } from './locale';

/**
 * Mensajes de error que ve el usuario (los que lanzan los servicios con
 * `new XxxException('...')` y los de validacion de los DTO). El texto en
 * espanol, tal como esta escrito en el codigo, es la clave; error-messages.spec.ts
 * comprueba que cada mensaje del codigo tiene su traduccion aqui, asi que
 * anadir un error nuevo sin traducir rompe el test.
 */
const EN: Record<string, string> = {
  // auth
  'Falta el refresh token': 'The refresh token is missing',
  'Ya existe una cuenta con ese email': 'An account with that email already exists',
  'Credenciales inválidas': 'Invalid credentials',
  'Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.':
    'Confirm your email before signing in. Check your inbox.',
  'El enlace de confirmación no es válido o ha caducado':
    'The confirmation link is invalid or has expired',
  'El enlace para restablecer la contraseña no es válido o ha caducado':
    'The password reset link is invalid or has expired',
  'Usuario no encontrado': 'User not found',
  'Esta cuenta usa Google para iniciar sesión y no tiene contraseña que cambiar':
    'This account signs in with Google and has no password to change',
  'La contraseña actual no es correcta': 'The current password is incorrect',
  'Introduce tu contraseña para confirmar': 'Enter your password to confirm',
  'La contraseña no es correcta': 'The password is incorrect',
  'Token de Google inválido': 'Invalid Google token',
  'El token de Google no incluye un email': "The Google token doesn't include an email",
  'Token de Apple inválido': 'Invalid Apple token',
  'El token de Apple no incluye un email': "The Apple token doesn't include an email",
  'Refresh token inválido': 'Invalid refresh token',
  'Refresh token inválido o expirado': 'Invalid or expired refresh token',
  'La contraseña debe tener al menos 8 caracteres':
    'The password must be at least 8 characters long',
  // dashboard / servidor
  'El acceso del dashboard no esta configurado': 'Dashboard access is not configured',
  'Clave del dashboard invalida': 'Invalid dashboard key',
  'Firebase no esta configurado en este servidor: no se ha enviado nada':
    'Firebase is not configured on this server: nothing was sent',
  // competiciones y jornadas
  'Competición no encontrada': 'Competition not found',
  'Jornada no encontrada': 'Matchday not found',
  'direction debe ser "previous" o "next"': 'direction must be "previous" or "next"',
  // grupos
  'Grupo no encontrado': 'Group not found',
  'Código de invitación inválido': 'Invalid invitation code',
  'El grupo es privado, necesitas un link de invitación':
    'The group is private, you need an invitation link',
  'No perteneces a este grupo': "You don't belong to this group",
  'Solo un administrador del grupo puede hacer esto': 'Only a group administrator can do this',
  'Solo el creador del grupo puede hacer esto': 'Only the group creator can do this',
  'El creador debe transferir la propiedad o eliminar el grupo antes de salir':
    'The creator must transfer ownership or delete the group before leaving',
  'Ese usuario no es miembro del grupo': 'That user is not a member of the group',
  'Ese usuario no es miembro de este grupo': 'That user is not a member of this group',
  'No se puede expulsar a un administrador ni al creador del grupo':
    "An administrator or the group creator can't be removed",
  'El creador siempre es administrador; transfiere la propiedad para cambiar esto':
    'The creator is always an administrator; transfer ownership to change this',
  'Ya eres el propietario de este grupo': 'You are already the owner of this group',
  'El nuevo propietario debe ser ya miembro del grupo':
    'The new owner must already be a member of the group',
  'Selecciona al menos una competición': 'Select at least one competition',
  'No se pueden desactivar competiciones ya activadas en el grupo, solo anadir nuevas':
    "Competitions already activated in the group can't be deactivated, only new ones added",
  'Ya eres miembro de este grupo': 'You are already a member of this group',
  // pronosticos
  'Partido no encontrado': 'Match not found',
  'Este partido ya ha empezado, no se admiten más predicciones':
    'This match has already started, no more predictions are accepted',
  'Todavía no se puede predecir esta jornada, espera a que sea la jornada actual':
    "This matchday can't be predicted yet, wait until it is the current matchday",
  'Este grupo juega en modo resultado exacto, no admite pronóstico 1X2':
    "This group plays in exact score mode and doesn't accept a 1X2 prediction",
  'Falta el resultado exacto (goles local y visitante)':
    'The exact score is missing (home and away goals)',
  'Este grupo juega en modo 1X2, no admite resultado exacto':
    "This group plays in 1X2 mode and doesn't accept an exact score",
  'Falta el pronóstico 1X2': 'The 1X2 prediction is missing',
  'Elige un grupo distinto del actual': 'Choose a group different from the current one',
  'Solo se puede copiar entre grupos con el mismo modo de juego (1X2 o resultado exacto)':
    'You can only copy between groups with the same game mode (1X2 or exact score)',
  'Esa jornada no pertenece a una competición activa de este grupo':
    "That matchday doesn't belong to an active competition of this group",
  'Las predicciones del grupo se ven cuando cierra la jornada':
    "The group's predictions are visible once the matchday closes",
  // comodines
  'El comodín de remontada está desactivado en este grupo':
    'The comeback wildcard is turned off in this group',
  'Esta jornada ya no admite comodines nuevos': 'This matchday no longer accepts new wildcards',
  'No te quedan comodines de remontada disponibles esta jornada':
    'You have no comeback wildcards left this matchday',
  // usuarios
  'Tu cuenta ya tiene un referidor asignado': 'Your account already has a referrer assigned',
  'Código de invitación no válido': 'Invalid invitation code',
  'No puedes usar tu propio código': "You can't use your own code",
  'Usa solo letras, números, espacios, guiones y apostrofes':
    'Use only letters, numbers, spaces, hyphens and apostrophes',
};

/** Mensajes con datos dentro (fechas, niveles): se reconocen por su forma y se vuelven a escribir con esos datos. */
const EN_PATTERNS: Array<{ pattern: RegExp; build: (match: RegExpMatchArray) => string }> = [
  {
    pattern:
      /^Solo puedes cambiar el nombre una vez por semana\. Podras hacerlo de nuevo el (.+)\.$/,
    build: (match) =>
      `You can only change your name once a week. You can do it again on ${match[1]}.`,
  },
  {
    pattern: /^Necesitas el nivel (\d+) para usar esta mascota\.$/,
    build: (match) => `You need level ${match[1]} to use this mascot.`,
  },
  {
    pattern: /^Necesitas el nivel (\d+) para usar este color\.$/,
    build: (match) => `You need level ${match[1]} to use this color.`,
  },
];

export function translateErrorMessage(message: string, locale: Locale): string {
  if (locale === 'es') return message;
  const exact = EN[message];
  if (exact) return exact;
  for (const { pattern, build } of EN_PATTERNS) {
    const match = message.match(pattern);
    if (match) return build(match);
  }
  return message;
}
