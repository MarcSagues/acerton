/**
 * Eleccion del aviso de cookies, compartida entre el propio aviso y los
 * servicios que dependen de ella (ClarityService).
 *
 * v2: desde que el aviso incluye tambien analitica (Microsoft Clarity), una
 * aceptacion antigua (solo anuncios de Google) no vale como consentimiento
 * para analitica, asi que se vuelve a preguntar una vez.
 */
const STORAGE_KEY = 'quiniela.cookieConsent.v2';

export type ConsentChoice = 'accepted' | 'rejected';

export function readCookieConsent(): ConsentChoice | null {
  try {
    return localStorage.getItem(STORAGE_KEY) as ConsentChoice | null;
  } catch {
    return null;
  }
}

export function storeCookieConsent(choice: ConsentChoice): void {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* localStorage no disponible: el aviso volvera a salir la proxima vez */
  }
}
