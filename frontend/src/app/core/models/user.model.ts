export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  /** Color de fondo detras del avatar de catalogo (null = sin color propio). */
  avatarBackground: string | null;
  /** false solo para cuentas de Google recien creadas: el nombre vino del perfil de Google, no lo eligio el usuario. */
  usernameConfirmed: boolean;
  /** ISO date a partir de la cual se puede volver a cambiar el nombre, o null si ya se puede ahora. */
  nameChangeAvailableAt: string | null;
  /** true tras terminar u omitir el tutorial por primera vez (por cuenta, no por dispositivo ni por grupo). */
  tutorialCompleted: boolean;
  /** false hasta confirmar el email (cuentas de Google nacen ya verificadas). */
  emailVerified: boolean;
  /** false en cuentas solo-Google: no tienen contrasena que cambiar. */
  hasPassword: boolean;
  /** Nivel derivado de la XP acumulada (Sprint 14, roadmap). */
  level: number;
}
