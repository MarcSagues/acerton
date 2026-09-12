import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AppConfig } from '../config/configuration';

interface SendParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envio de correo transaccional via la API HTTP de Resend (sin SDK propio:
 * un POST con axios, que ya es dependencia del proyecto, basta). Sin
 * RESEND_API_KEY configurada (desarrollo local sin cuenta de Resend todavia)
 * no falla: deja el correo en el log para poder probar el flujo entero
 * (confirmacion de email, restablecer contrasena) sin enviarlo de verdad.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  async sendVerificationEmail(to: string, name: string, verifyUrl: string): Promise<void> {
    await this.send({
      to,
      subject: 'Confirma tu cuenta de Piqo',
      html: `
        <p>Hola ${escapeHtml(name)},</p>
        <p>Gracias por registrarte en Piqo. Confirma tu cuenta pulsando este enlace:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>El enlace caduca en 24 horas. Si no has creado esta cuenta, ignora este correo.</p>
      `,
    });
  }

  async sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<void> {
    await this.send({
      to,
      subject: 'Restablece tu contraseña de Piqo',
      html: `
        <p>Hola ${escapeHtml(name)},</p>
        <p>Hemos recibido una solicitud para restablecer tu contraseña. Pulsa este enlace para elegir una nueva:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>El enlace caduca en 1 hora. Si no has pedido esto, ignora este correo: tu contraseña actual sigue funcionando.</p>
      `,
    });
  }

  private async send(params: SendParams): Promise<void> {
    const apiKey = this.configService.get('mail.resendApiKey', { infer: true });
    const from = this.configService.get('mail.from', { infer: true });

    if (!apiKey) {
      this.logger.warn(
        `RESEND_API_KEY no configurado: correo NO enviado a ${params.to} ("${params.subject}"). Contenido:\n${params.html}`,
      );
      return;
    }

    try {
      await axios.post(
        'https://api.resend.com/emails',
        { from, to: params.to, subject: params.subject, html: params.html },
        { headers: { Authorization: `Bearer ${apiKey}` } },
      );
    } catch (error) {
      // El llamador (AuthService) atrapa este fallo y no bloquea el registro
      // ni el reset de contrasena por el — pero sin loguearlo aqui, un fallo
      // real de Resend (dominio sin verificar, limite de plan, etc.) se
      // perdia en silencio y era imposible de diagnosticar.
      const detail = axios.isAxiosError(error) ? JSON.stringify(error.response?.data) : String(error);
      this.logger.error(`Fallo al enviar correo a ${params.to} ("${params.subject}"): ${detail}`);
      throw error;
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
