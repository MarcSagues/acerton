/**
 * Conserva el destino mientras el navegador sale de la app para completar
 * el acceso con Google y vuelve por el callback del backend.
 */
export const GOOGLE_RETURN_URL_KEY = 'quiniela.googleReturnUrl';

/**
 * Codigo de referido capturado al abrir un link de invitacion (ver
 * referral-link.guard.ts) mientras el usuario todavia no tiene cuenta —
 * se envia con el registro (email o Google) y se limpia tras usarlo, exista
 * o no la cuenta final (mismo criterio best-effort que el backend).
 */
export const PENDING_REFERRAL_CODE_KEY = 'quiniela.pendingReferralCode';
