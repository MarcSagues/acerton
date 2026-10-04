import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { MailService } from './mail.service';

jest.mock('axios');

const postMock = axios.post as jest.Mock;

function buildService(): MailService {
  const config = {
    get: (key: string) => (key === 'mail.resendApiKey' ? 'key' : 'Piqo <hola@piqo.es>'),
  } as unknown as ConfigService<never, true>;
  return new MailService(config);
}

function lastEmail(): { subject: string; html: string } {
  const payload = postMock.mock.calls.at(-1)?.[1] as { subject: string; html: string };
  return payload;
}

describe('MailService — idioma de los correos', () => {
  beforeEach(() => postMock.mockReset().mockResolvedValue({}));

  it('confirmacion de correo: espanol por defecto', async () => {
    await buildService().sendVerificationEmail('a@b.c', 'https://app.piqo.es/verify-email?token=t');
    const { subject, html } = lastEmail();
    expect(subject).toBe('Confirma tu correo en Piqo');
    expect(html).toContain('<html lang="es"');
    expect(html).toContain('Confirma tu correo electrónico');
    expect(html).toContain('Este enlace caduca en 24 horas.');
    expect(html).toContain('href="https://app.piqo.es/verify-email?token=t"');
  });

  it('confirmacion de correo: ingles si se pide', async () => {
    await buildService().sendVerificationEmail(
      'a@b.c',
      'https://app.piqo.es/verify-email?token=t',
      'en',
    );
    const { subject, html } = lastEmail();
    expect(subject).toBe('Confirm your email on Piqo');
    expect(html).toContain('<html lang="en"');
    expect(html).toContain('Confirm your email address');
    expect(html).toContain('This link expires in 24 hours.');
    expect(html).toContain('Piqo is not a gambling operator');
    expect(html).toContain('href="https://app.piqo.es/verify-email?token=t"');
    expect(html).not.toMatch(/Confirma tu correo|caduca|peña|apuestas/);
  });

  it('restablecer contrasena: espanol por defecto e ingles si se pide', async () => {
    const service = buildService();
    await service.sendPasswordResetEmail('a@b.c', 'https://app.piqo.es/reset-password?token=t');
    expect(lastEmail().subject).toBe('Restablece tu contraseña de Piqo');
    expect(lastEmail().html).toContain('¿Olvidaste tu contraseña?');

    await service.sendPasswordResetEmail(
      'a@b.c',
      'https://app.piqo.es/reset-password?token=t',
      'en',
    );
    const { subject, html } = lastEmail();
    expect(subject).toBe('Reset your Piqo password');
    expect(html).toContain('<html lang="en"');
    expect(html).toContain('Forgot your password?');
    expect(html).toContain('This link expires in 60 minutes for security.');
    expect(html).not.toMatch(/contraseña|caduca|ignorar|apuestas/);
  });

  it('no quedan marcadores de plantilla sin sustituir', async () => {
    const service = buildService();
    await service.sendVerificationEmail('a@b.c', 'https://x.y/z', 'en');
    await service.sendPasswordResetEmail('a@b.c', 'https://x.y/z', 'es');
    expect(
      postMock.mock.calls.every(
        (call) => !/\$\{|undefined/.test((call[1] as { html: string }).html),
      ),
    ).toBe(true);
  });
});
