export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  /** false solo para cuentas de Google recien creadas: el nombre vino del perfil de Google, no lo eligio el usuario. */
  usernameConfirmed: boolean;
  /** ISO date a partir de la cual se puede volver a cambiar el nombre, o null si ya se puede ahora. */
  nameChangeAvailableAt: string | null;
  /** true tras terminar u omitir el tutorial por primera vez (por cuenta, no por dispositivo ni por grupo). */
  tutorialCompleted: boolean;
}
