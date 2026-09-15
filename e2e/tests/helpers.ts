import { Locator, Page, expect } from '@playwright/test';

/**
 * Cuenta sembrada por backend/scripts/seed-comeback-demo.ts (email
 * verificado, tutorial ya completado). Se reutiliza para todos los tests en
 * vez de registrar una cuenta nueva por test, porque el alta real exige
 * confirmar el correo (no hay forma de "hacer click" en ese enlace desde
 * aqui) — ver auth.spec.ts para el unico test que sí cubre el registro
 * (hasta la pantalla de "revisa tu correo", sin poder verificar de verdad).
 */
export const DEMO_USER = { email: 'demo-tu@piqo.test', password: 'Demo1234!' };

/** Nombre de grupo unico por ejecucion, para no colisionar entre tests ni con datos previos de QA manual. */
export function uniqueGroupName(label: string): string {
  return `E2E ${label} ${Date.now()}`;
}

/**
 * Login por UI (no por API): el token de acceso vive solo en memoria en el
 * frontend (nunca en localStorage — ver AuthService), asi que cualquier
 * prueba a nivel de navegador tiene que pasar por el formulario real. Se
 * captura el accessToken de la respuesta de /api/auth/login para poder
 * hacer, aparte, llamadas directas a la API (ej. conceder el comodin extra
 * de video sin depender de AdMob) usando `page.request` con ese Bearer.
 */
export async function login(page: Page): Promise<string> {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Entrar con correo' }).click();
  await page.locator('input[formcontrolname="email"]').fill(DEMO_USER.email);
  await page.locator('input[formcontrolname="password"]').fill(DEMO_USER.password);

  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Entrar', exact: true }).click(),
  ]);
  expect(response.ok()).toBeTruthy();
  const body = await response.json();

  await expect(page.getByRole('link', { name: 'Jornada' })).toBeVisible({ timeout: 15_000 });
  return body.accessToken as string;
}

export interface CreateGroupOptions {
  name: string;
  competition?: string;
  scoringMode: 'ONE_X_TWO' | 'EXACT_SCORE';
  comebackEnabled?: boolean;
}

/** Crea un grupo por UI y lo deja como grupo activo (comportamiento real del formulario). Devuelve su id. */
export async function createGroup(page: Page, options: CreateGroupOptions): Promise<string> {
  const competition = options.competition ?? 'Premier League';
  await page.goto('/groups/create');
  await page.getByRole('checkbox', { name: competition }).click();
  await page.getByRole('button', { name: /^Continuar/ }).click();

  await page.locator('input[formcontrolname="name"]').fill(options.name);

  const modeLabel = options.scoringMode === 'EXACT_SCORE' ? 'Resultado exacto' : 'Quiniela 1X2';
  await page.getByRole('radio', { name: modeLabel }).click();

  if (options.comebackEnabled === false) {
    await page.getByRole('radio', { name: 'Desactivado', exact: true }).click();
  } else {
    // exact:true es imprescindible aqui: "Activado" es substring de "Desactivado",
    // así que sin esto el matcher por accesible-name encuentra los dos radios.
    await page.getByRole('radio', { name: 'Activado', exact: true }).click();
  }

  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/groups') && r.request().method() === 'POST'),
    page.getByRole('button', { name: /^Crear grupo con modo/ }).click(),
  ]);
  expect(response.ok()).toBeTruthy();
  const group = await response.json();
  return group.id as string;
}

/** Id de la jornada actual (la que se ve en /matchday) para ese grupo, via la misma API que usa el frontend. */
export async function getCurrentMatchdayId(page: Page, accessToken: string, groupId: string): Promise<string> {
  const res = await page.request.get(`http://localhost:3000/api/groups/${groupId}/matchdays/current`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(res.ok()).toBeTruthy();
  const entries = await res.json();
  expect(entries.length).toBeGreaterThan(0);
  return entries[0].matchday.id as string;
}

/**
 * Concede el comodin extra de remontada de esta jornada llamando
 * directamente al endpoint que en la app real dispara AdsService tras ver
 * el video de AdMob (que no se puede reproducir en un navegador de
 * escritorio de test) — ver WildcardsService.claimAdReward. Es la unica
 * forma repetible de tener remaining > 0 sin depender de la clasificacion
 * real del grupo (un grupo recien creado con un solo miembro nunca va por
 * detras de nadie).
 */
export async function grantComebackBonus(
  page: Page,
  accessToken: string,
  groupId: string,
  matchdayId: string,
): Promise<void> {
  const res = await page.request.post(`http://localhost:3000/api/groups/${groupId}/wildcards/comeback/ad-reward`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { matchdayId },
  });
  expect(res.ok()).toBeTruthy();
}

/**
 * Simula la pulsacion larga (550ms, ver startLongPress en
 * current-matchday.facade.ts) que abre el panel del comodin de remontada.
 * Un click normal de Playwright suelta demasiado rapido para dispararla,
 * asi que se despachan los eventos de puntero a mano con una espera real
 * de por medio.
 */
export async function longPress(locator: Locator, page: Page): Promise<void> {
  await locator.dispatchEvent('pointerdown');
  await page.waitForTimeout(700);
  await locator.dispatchEvent('pointerup');
}
