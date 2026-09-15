import { test, expect } from '@playwright/test';
import { login } from './helpers';

const API = 'http://localhost:3000/api';

/**
 * Las preferencias granulares (jornada nueva, recordatorios de cierre,
 * reenganche...) solo se muestran una vez el push está "Activadas en este
 * dispositivo" (permiso del navegador concedido Y token ya registrado en el
 * backend contra Firebase — ver notification-settings.component.html). Ese
 * registro real contra FCM no es algo que se pueda simular de forma fiable
 * en un test (dependencia de red externa, service worker, VAPID key), así
 * que aquí solo se cubre lo que sí es determinista: la pantalla y el aviso
 * de permiso antes de activarlas.
 */
test.describe('Preferencias de notificaciones', () => {
  test('la pantalla pide activar las notificaciones push antes de mostrar las preferencias', async ({ page }) => {
    await login(page);
    await page.goto('/notifications/preferences');

    await expect(page.getByRole('heading', { name: 'Preferencias de avisos' })).toBeVisible();
    await expect(page.getByText('Notificaciones push en este dispositivo')).toBeVisible();
    // El texto exacto depende del permiso de Notification en el perfil de
    // Chromium usado por Playwright — por defecto suele venir "denied" en vez
    // de "default" (a diferencia de un navegador real recien instalado), así
    // que se acepta cualquiera de los estados de "todavía no activado".
    await expect(
      page.getByText(/Hace falta darles permiso en este dispositivo\.|Bloqueadas en los permisos del navegador\./),
    ).toBeVisible();

    // Sin push activado (sea cual sea el motivo), ninguna fila de preferencia individual debe verse.
    await expect(page.getByText('Jornada nueva disponible')).not.toBeVisible();
  });

  test('la API de preferencias guarda y devuelve el cambio (incluida la de reenganche)', async ({ page }) => {
    const accessToken = await login(page);
    const headers = { Authorization: `Bearer ${accessToken}` };

    const before = await page.request.get(`${API}/users/me/notification-preferences`, { headers });
    expect(before.ok()).toBeTruthy();
    const original = await before.json();
    expect(original).toHaveProperty('reengagement');

    const toggled = !original.reengagement;
    const patched = await page.request.patch(`${API}/users/me/notification-preferences`, {
      headers,
      data: { reengagement: toggled },
    });
    expect(patched.ok()).toBeTruthy();
    expect((await patched.json()).reengagement).toBe(toggled);

    const after = await page.request.get(`${API}/users/me/notification-preferences`, { headers });
    expect((await after.json()).reengagement).toBe(toggled);

    // Deja la preferencia como estaba para no afectar al uso manual de esta cuenta.
    await page.request.patch(`${API}/users/me/notification-preferences`, {
      headers,
      data: { reengagement: original.reengagement },
    });
  });
});
