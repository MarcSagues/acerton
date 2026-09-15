import { test, expect } from '@playwright/test';
import { createGroup, getCurrentMatchdayId, grantComebackBonus, login, longPress, uniqueGroupName } from './helpers';

test.describe('Jornada — modo resultado exacto', () => {
  test('escribir un marcador lo guarda y persiste tras recargar', async ({ page }) => {
    await login(page);
    await createGroup(page, { name: uniqueGroupName('Exacto marcador'), scoringMode: 'EXACT_SCORE' });
    await page.goto('/matchday');

    const firstCard = page.locator('.match-card').first();
    const inputs = firstCard.locator('.score-input');
    await inputs.nth(0).fill('2');
    await inputs.nth(1).fill('1');

    // Sin badge "Guardado" en este modo (ver current-matchday.component.html):
    // el propio marcador confirmado (borde de color) es la señal de guardado.
    await expect(firstCard.locator('.exact-score-box.confirmed')).toBeVisible({ timeout: 10_000 });

    await page.reload();
    await expect(inputs.nth(0)).toHaveValue('2', { timeout: 10_000 });
    await expect(inputs.nth(1)).toHaveValue('1');
  });

  test.describe('comodín de remontada (duplicar puntos)', () => {
    test('sin comodines disponibles no aparece el aviso flotante', async ({ page }) => {
      await login(page);
      await createGroup(page, { name: uniqueGroupName('Exacto sin comodin'), scoringMode: 'EXACT_SCORE' });
      await page.goto('/matchday');

      // Un grupo recien creado con un solo miembro nunca va por detras de nadie
      // (gap 0) y no se ha reclamado el comodin de video: remaining = 0.
      await expect(page.getByText(/comodín de remontada esta jornada/)).not.toBeVisible();
    });

    test('con un comodín disponible se puede activar el x2, ver el badge y persiste', async ({ page }) => {
      const accessToken = await login(page);
      const groupId = await createGroup(page, {
        name: uniqueGroupName('Exacto comodin'),
        scoringMode: 'EXACT_SCORE',
        comebackEnabled: true,
      });
      const matchdayId = await getCurrentMatchdayId(page, accessToken, groupId);
      await grantComebackBonus(page, accessToken, groupId, matchdayId);

      await page.goto('/matchday');
      await expect(page.getByText('Tienes 1 comodín de remontada esta jornada')).toBeVisible();

      const firstCard = page.locator('.match-card').first();
      await longPress(firstCard.locator('.score-widget'), page);

      const sheet = page.locator('.piqo-sheet-panel');
      await expect(sheet.getByText('Te queda 1 comodín esta jornada')).toBeVisible();
      const activateButton = sheet.getByRole('button', { name: 'Duplicar puntos de este partido (x2)' });
      await expect(activateButton).toBeVisible();
      await activateButton.click();

      await expect(firstCard.locator('.wildcard-x2-badge')).toBeVisible();

      // El badge aparece pero, sin marcador todavia, no hay nada que guardar
      // (ver current-matchday.facade.ts save(): exige ambos goles rellenos).
      const inputs = firstCard.locator('.score-input');
      await inputs.nth(0).fill('3');
      await inputs.nth(1).fill('0');
      await expect(firstCard.locator('.exact-score-box.confirmed')).toBeVisible({ timeout: 10_000 });

      await page.reload();
      await expect(firstCard.locator('.wildcard-x2-badge')).toBeVisible({ timeout: 10_000 });
      await expect(inputs.nth(0)).toHaveValue('3');
      await expect(inputs.nth(1)).toHaveValue('0');

      // El aviso normal de "tienes comodines" no debe reaparecer: ya no queda
      // cupo (remaining 0) mientras el x2 siga puesto en el unico hueco usado.
      await expect(page.getByText(/comodín de remontada esta jornada/)).not.toBeVisible();

      // Quitar el comodin lo revierte y libera el cupo de nuevo.
      await longPress(firstCard.locator('.score-widget'), page);
      await page.locator('.piqo-sheet-panel').getByRole('button', { name: 'Quitar comodín' }).click();

      await expect(firstCard.locator('.wildcard-x2-badge')).not.toBeVisible();
      await expect(page.getByText('Tienes 1 comodín de remontada esta jornada')).toBeVisible();
    });
  });
});
