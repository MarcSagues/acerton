import { test, expect } from '@playwright/test';
import { DEMO_USER, login } from './helpers';

test.describe('Autenticación', () => {
  test('login con credenciales válidas entra en la app (barra inferior visible)', async ({ page }) => {
    // No se asume a qué pantalla aterriza: postLoginRoute() manda a /groups si
    // la cuenta tiene más de un grupo y a /matchday si solo tiene uno (ver
    // GroupsService.postLoginRoute) — lo estable es que ya se puede navegar.
    await login(page);
    await expect(page.getByRole('link', { name: 'Grupos' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tabla' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Perfil' })).toBeVisible();

    await page.goto('/matchday');
    await expect(page.locator('.match-card').first()).toBeVisible({ timeout: 10_000 });
  });

  test('login con contraseña incorrecta muestra un error y no entra', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Entrar con correo' }).click();
    await page.locator('input[formcontrolname="email"]').fill(DEMO_USER.email);
    await page.locator('input[formcontrolname="password"]').fill('contraseña-incorrecta');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();

    await expect(page.locator('.error')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Jornada' })).not.toBeVisible();
  });

  test('el registro pide confirmar el correo antes de dejar entrar', async ({ page }) => {
    const email = `e2e-${Date.now()}@piqo.test`;
    await page.goto('/register');
    await page.locator('input[formcontrolname="name"]').fill('E2E Tester');
    await page.locator('input[formcontrolname="email"]').fill(email);
    await page.locator('input[formcontrolname="password"]').fill('Test12345678!');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByRole('heading', { name: 'Revisa tu correo' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(email)).toBeVisible();
  });

  test('cerrar sesión desde el perfil vuelve al login', async ({ page }) => {
    await login(page);
    await page.goto('/profile');
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    // El botón abre un diálogo de confirmación (mismo texto en el botón de confirmar) antes de cerrar sesión de verdad.
    await page.locator('.piqo-dialog-panel').getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 });
  });
});
