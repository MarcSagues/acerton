import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Perfil', () => {
  test('la página de perfil muestra los botones de sesión y tutorial a ancho completo', async ({ page }) => {
    await login(page);
    await page.goto('/profile');

    const replayButton = page.getByRole('button', { name: 'Ver tutorial de nuevo' });
    const logoutButton = page.getByRole('button', { name: 'Cerrar sesión' });
    await expect(replayButton).toBeVisible();
    await expect(logoutButton).toBeVisible();

    // Regresión: ambos botones deben ocupar el ancho completo de la columna
    // (antes tenían max-width y quedaban centrados y estrechos) — ver
    // profile-page.component.scss .replay-btn/.logout-btn.
    const [replayBox, logoutBox] = await Promise.all([replayButton.boundingBox(), logoutButton.boundingBox()]);
    expect(replayBox).not.toBeNull();
    expect(logoutBox).not.toBeNull();
    expect(Math.abs((replayBox!.width ?? 0) - (logoutBox!.width ?? 0))).toBeLessThan(2);
    expect(replayBox!.width).toBeGreaterThan(250);
  });
});
