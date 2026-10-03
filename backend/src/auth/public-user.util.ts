import { PublicUser } from './auth.types';
import { xpProgressForLevel } from '../xp/xp.util';

/** Cuanto hay que esperar entre dos cambios de nombre (ver UsersService.updateName). */
export const NAME_CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

type UserForPublic = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  avatarBackground: string | null;
  usernameConfirmed: boolean;
  nameChangedAt: Date | null;
  tutorialCompletedAt: Date | null;
  emailVerifiedAt: Date | null;
  passwordHash: string | null;
  experience: number;
};

export function toPublicUser(user: UserForPublic): PublicUser {
  const nameChangeAvailableAt = user.nameChangedAt
    ? new Date(user.nameChangedAt.getTime() + NAME_CHANGE_COOLDOWN_MS)
    : null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    avatarBackground: user.avatarBackground,
    usernameConfirmed: user.usernameConfirmed,
    nameChangeAvailableAt:
      nameChangeAvailableAt && nameChangeAvailableAt.getTime() > Date.now()
        ? nameChangeAvailableAt.toISOString()
        : null,
    tutorialCompleted: user.tutorialCompletedAt !== null,
    emailVerified: user.emailVerifiedAt !== null,
    hasPassword: user.passwordHash !== null,
    /// Nivel derivado de la XP acumulada (Sprint 14, roadmap) — se manda
    /// resuelto, no la XP en bruto, para que todos los clientes (web/iOS/
    /// Android) muestren siempre el mismo numero sin duplicar la formula.
    level: xpProgressForLevel(user.experience).level,
  };
}
