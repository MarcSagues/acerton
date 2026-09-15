import { test, expect } from '@playwright/test';
import { createGroup, deleteGroup, login, uniqueGroupName } from './helpers';

test.describe('Grupos', () => {
  test('crear un grupo en modo 1X2 lo deja activo con el comodín visible en ajustes', async ({ page }) => {
    const accessToken = await login(page);
    const name = uniqueGroupName('1X2');
    const groupId = await createGroup(page, { name, scoringMode: 'ONE_X_TWO' });
    try {
      // El formulario ya deja el grupo nuevo como activo — se ve reflejado en Jornada sin tener que cambiar de grupo.
      await page.goto('/matchday');
      await expect(page.locator('.switcher .name')).toHaveText(name);

      await page.goto(`/groups`);
      await expect(page.getByText(name)).toBeVisible();
    } finally {
      await deleteGroup(page, accessToken, groupId);
    }
  });

  test('crear un grupo en modo resultado exacto también permite dejar el comodín activado', async ({ page }) => {
    // Regresión: el comodín de remontada se ocultaba (y el backend lo forzaba a
    // desactivado) en grupos de resultado exacto antes de añadir el comodín de
    // "duplicar puntos" para ese modo — ver groups.service.ts.
    const accessToken = await login(page);
    const name = uniqueGroupName('Exacto');
    const groupId = await createGroup(page, { name, scoringMode: 'EXACT_SCORE', comebackEnabled: true });
    try {
      await page.goto('/matchday');
      await expect(page.locator('.switcher .name')).toHaveText(name);
    } finally {
      await deleteGroup(page, accessToken, groupId);
    }
  });

  test('los ajustes del grupo permiten desactivar y reactivar el comodín de remontada', async ({ page }) => {
    const accessToken = await login(page);
    const name = uniqueGroupName('Ajustes');
    const groupId = await createGroup(page, { name, scoringMode: 'ONE_X_TWO', comebackEnabled: true });
    try {
      await page.goto(`/groups/${groupId}/settings`);
      const comebackCard = page.locator('.rule-card', { hasText: 'Comodín de remontada' });
      const comebackToggle = comebackCard.locator('button.toggle');
      await expect(comebackToggle).toHaveClass(/on/);

      await comebackToggle.click();
      await expect(comebackToggle).not.toHaveClass(/on/);
      await page.getByRole('button', { name: 'Guardar cambios' }).click();
      await expect(page.getByRole('button', { name: 'Guardar cambios' })).not.toBeVisible();

      await page.reload();
      await expect(comebackToggle).not.toHaveClass(/on/);
    } finally {
      await deleteGroup(page, accessToken, groupId);
    }
  });
});
