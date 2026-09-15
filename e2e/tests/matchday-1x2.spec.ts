import { test, expect } from '@playwright/test';
import { createGroup, deleteGroup, login, uniqueGroupName } from './helpers';

test.describe('Jornada — modo 1X2', () => {
  test('elegir un pronóstico 1X2 lo guarda y persiste tras recargar', async ({ page }) => {
    const accessToken = await login(page);
    const groupId = await createGroup(page, { name: uniqueGroupName('Jornada 1X2'), scoringMode: 'ONE_X_TWO' });
    try {
      await page.goto('/matchday');

      const firstCard = page.locator('.match-card').first();
      await expect(firstCard).toBeVisible();
      await firstCard.getByRole('button', { name: '1', exact: true }).click();

      await expect(firstCard.getByText('Guardado')).toBeVisible({ timeout: 10_000 });
      await expect(firstCard.getByRole('button', { name: '1', exact: true })).toHaveAttribute('aria-pressed', 'true');

      await page.reload();
      await expect(firstCard.getByRole('button', { name: '1', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
        { timeout: 10_000 },
      );
    } finally {
      await deleteGroup(page, accessToken, groupId);
    }
  });

  test('el contador de la jornada sube según se completan pronósticos', async ({ page }) => {
    const accessToken = await login(page);
    const groupId = await createGroup(page, { name: uniqueGroupName('Contador 1X2'), scoringMode: 'ONE_X_TWO' });
    try {
      await page.goto('/matchday');

      await expect(page.getByText('0/10')).toBeVisible();

      const cards = page.locator('.match-card');
      await cards.nth(0).getByRole('button', { name: '1', exact: true }).click();
      await expect(page.getByText('Guardado').first()).toBeVisible({ timeout: 10_000 });

      await expect(page.getByText('1/10')).toBeVisible();
    } finally {
      await deleteGroup(page, accessToken, groupId);
    }
  });
});
