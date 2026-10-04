import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AppConfig } from '../config/configuration';
import { Locale } from '../common/i18n/locale';

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

  async sendVerificationEmail(to: string, verifyUrl: string, locale: Locale = 'es'): Promise<void> {
    await this.send({
      to,
      subject: VERIFICATION_COPY[locale].subject,
      html: verificationEmailHtml(verifyUrl, locale),
    });
  }

  async sendPasswordResetEmail(to: string, resetUrl: string, locale: Locale = 'es'): Promise<void> {
    await this.send({
      to,
      subject: RESET_COPY[locale].subject,
      html: passwordResetEmailHtml(resetUrl, locale),
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
      const detail = axios.isAxiosError(error)
        ? JSON.stringify(error.response?.data)
        : String(error);
      this.logger.error(`Fallo al enviar correo a ${params.to} ("${params.subject}"): ${detail}`);
      throw error;
    }
  }
}

interface EmailCopy {
  subject: string;
  preheader: string;
  mascotAlt: string;
  heading: string;
  body: string;
  button: string;
  expiry: string;
  buttonFallback: string;
  ignore: string;
}

const VERIFICATION_COPY: Record<Locale, EmailCopy> = {
  es: {
    subject: 'Confirma tu correo en Piqo',
    preheader: 'Un paso más y ya puedes crear tu grupo y montar la porra con tu peña.',
    mascotAlt: 'Mascota de Piqo celebrando',
    heading: 'Confirma tu correo electrónico',
    body: 'Gracias por crear tu cuenta en Piqo. Confirma tu correo para activarla y poder crear tu grupo, elegir competición y compartir el enlace con tu peña.',
    button: 'Confirmar mi correo',
    expiry: 'Este enlace caduca en 24 horas.',
    buttonFallback: '¿El botón no funciona? Copia y pega este enlace en tu navegador:',
    ignore: 'Si no has creado una cuenta en Piqo, puedes ignorar este correo.',
  },
  en: {
    subject: 'Confirm your email on Piqo',
    preheader:
      'One more step and you can create your group and start your football pool with your friends.',
    mascotAlt: 'Piqo mascot celebrating',
    heading: 'Confirm your email address',
    body: 'Thanks for creating your Piqo account. Confirm your email to activate it, so you can create your group, choose a competition and share the link with your friends.',
    button: 'Confirm my email',
    expiry: 'This link expires in 24 hours.',
    buttonFallback: 'Button not working? Copy and paste this link into your browser:',
    ignore: "If you didn't create a Piqo account, you can ignore this email.",
  },
};

const RESET_COPY: Record<Locale, EmailCopy> = {
  es: {
    subject: 'Restablece tu contraseña de Piqo',
    preheader: 'Este enlace para restablecer tu contraseña caduca en 60 minutos.',
    mascotAlt: 'Mascota de Piqo pensando',
    heading: '¿Olvidaste tu contraseña?',
    body: 'Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Piqo. Pulsa el botón de abajo para crear una nueva contraseña.',
    button: 'Restablecer contraseña',
    expiry: 'Este enlace caduca en 60 minutos por seguridad.',
    buttonFallback: '¿El botón no funciona? Copia y pega este enlace en tu navegador:',
    ignore:
      'Si no has solicitado este cambio, puedes ignorar este correo: tu contraseña seguirá siendo la misma.',
  },
  en: {
    subject: 'Reset your Piqo password',
    preheader: 'This link to reset your password expires in 60 minutes.',
    mascotAlt: 'Piqo mascot thinking',
    heading: 'Forgot your password?',
    body: 'We received a request to reset the password of your Piqo account. Tap the button below to create a new password.',
    button: 'Reset password',
    expiry: 'This link expires in 60 minutes for security.',
    buttonFallback: 'Button not working? Copy and paste this link into your browser:',
    ignore:
      "If you didn't request this change, you can ignore this email: your password will stay the same.",
  },
};

/** Pie comun a los dos correos. */
const FOOTER_COPY: Record<Locale, { tagline: string; notOperator: string }> = {
  es: {
    tagline:
      'La app para hacer la porra de fútbol con tu grupo.<br/>Sin dinero, sin apuestas y sin hojas de cálculo.',
    notOperator: 'Piqo no es un operador de juego. No se admiten apuestas ni premios en metálico.',
  },
  en: {
    tagline:
      'The app for running a football pool with your group.<br/>No money, no bets and no spreadsheets.',
    notOperator: 'Piqo is not a gambling operator. Bets and cash prizes are not accepted.',
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Igual que verificationEmailHtml, pero para "restablecer contraseña". */
function passwordResetEmailHtml(resetUrl: string, locale: Locale): string {
  const url = escapeHtml(resetUrl);
  const c = RESET_COPY[locale];
  const footer = FOOTER_COPY[locale];
  return `<!DOCTYPE html>
<html lang="${locale}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${c.subject}</title>
<!--[if mso]>
<noscript>
  <xml>
    <o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
</noscript>
<style>
  table { border-collapse: collapse; }
  td, h1, p { font-family: Arial, Helvetica, sans-serif !important; }
</style>
<![endif]-->
<style>
  body, table, td { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
  a { text-decoration: none; }

  @media screen and (max-width: 600px) {
    .piqo-wrap { width: 100% !important; }
    .piqo-pad { padding-left: 22px !important; padding-right: 22px !important; }
    .piqo-h1 { font-size: 24px !important; line-height: 30px !important; }
    .piqo-btn { display: block !important; width: 100% !important; }
  }

  @media (prefers-color-scheme: dark) {
    .piqo-bg { background-color: #121619 !important; }
    .piqo-card { background-color: #1D2426 !important; }
    .piqo-text { color: #F1F0EA !important; }
    .piqo-muted { color: #ADB5B5 !important; }
    .piqo-border { border-color: #232B2E !important; }
  }
</style>
</head>
<body class="piqo-bg" style="margin: 0; padding: 0; background-color: #F4F2EC;">
<!-- preheader -->
<div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #F4F2EC; opacity: 0;">
  ${c.preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="piqo-bg" style="background-color: #F4F2EC;">
<tr>
<td align="center" style="padding: 32px 16px;">

  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="piqo-wrap" style="width: 600px; max-width: 600px;">

    <!-- header -->
    <tr>
      <td class="piqo-pad" style="background-color: #121619; border-radius: 20px 20px 0 0; padding: 32px 40px; text-align: center;">
        <img src="https://app.piqo.es/assets/email/piqo-wordmark-email.png" width="150" height="45" alt="Piqo" style="display: inline-block; width: 150px; height: 45px; border: 0;" />
      </td>
    </tr>

    <!-- card -->
    <tr>
      <td class="piqo-card" style="background-color: #FFFFFF;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="piqo-pad" style="padding: 44px 40px 8px; text-align: center;">
              <img src="https://app.piqo.es/assets/avatars/mascot/pensando.png" width="72" height="72" alt="${c.mascotAlt}" style="display: inline-block; width: 72px; height: 72px; border-radius: 50%; border: 2px solid #EFE3C8;" />
            </td>
          </tr>
          <tr>
            <td class="piqo-pad piqo-text" style="padding: 20px 40px 0; text-align: center; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 26px; line-height: 32px; font-weight: 800; color: #121619;" >
              <h1 class="piqo-h1" style="margin: 0; font-size: 26px; line-height: 32px; font-weight: 800; color: #121619;">${c.heading}</h1>
            </td>
          </tr>
          <tr>
            <td class="piqo-pad piqo-muted" style="padding: 14px 40px 0; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 26px; color: #6B6459;">
              ${c.body}
            </td>
          </tr>
          <tr>
            <td class="piqo-pad" style="padding: 32px 40px 8px; text-align: center;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${url}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="27%" fillcolor="#D2BE94" stroke="f">
              <w:anchorlock/>
              <center style="color:#121619;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${c.button}</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${url}" class="piqo-btn" style="display: inline-block; background-color: #D2BE94; color: #121619; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 16px; font-weight: 700; padding: 16px 36px; border-radius: 14px; text-decoration: none;">${c.button}</a>
              <!--<![endif]-->
            </td>
          </tr>
          <tr>
            <td class="piqo-pad piqo-muted" style="padding: 20px 40px 0; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 20px; color: #8A8272;">
              ${c.expiry}
            </td>
          </tr>
          <tr>
            <td class="piqo-pad" style="padding: 28px 40px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top: 1px solid #E3DDCC;">
                <tr><td style="padding-top: 24px;"></td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="piqo-pad piqo-muted" style="padding: 0 40px 0; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 20px; color: #8A8272;">
              ${c.buttonFallback}
            </td>
          </tr>
          <tr>
            <td class="piqo-pad" style="padding: 6px 40px 0; text-align: center; word-break: break-all;">
              <a href="${url}" style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #8A6A34;">${url}</a>
            </td>
          </tr>
          <tr>
            <td class="piqo-pad piqo-muted" style="padding: 28px 40px 40px; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 20px; color: #8A8272;">
              ${c.ignore}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- footer -->
    <tr>
      <td style="background-color: #0E1215; border-radius: 0 0 20px 20px; padding: 28px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding-bottom: 10px;">
              <img src="https://app.piqo.es/assets/email/piqo-isotipo-email.png" width="22" height="20" alt="" style="display: inline-block; width: 22px; height: 20px; border: 0; vertical-align: middle; margin-right: 6px;" /><span style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 15px; font-weight: 700; color: #D2BE94; vertical-align: middle;">Piqo</span>
            </td>
          </tr>
          <tr>
            <td align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 18px; color: #7C878D; padding-bottom: 10px;">
              ${footer.tagline}
            </td>
          </tr>
          <tr>
            <td align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 17px; color: #5C6467; padding-bottom: 6px;">
              ${footer.notOperator}
            </td>
          </tr>
          <tr>
            <td align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 17px; color: #5C6467;">
              © 2026 Piqo · <a href="https://piqo.es" style="color: #7C878D;">piqo.es</a> · <a href="mailto:support@piqo.es" style="color: #7C878D;">support@piqo.es</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

  </table>

</td>
</tr>
</table>
</body>
</html>`;
}

/**
 * Plantilla de "confirma tu correo" (diseño aportado por el usuario,
 * exportado de un editor de email). Los assets (wordmark e isotipo) se
 * sirven desde app.piqo.es/assets/email/ (parte del build del frontend,
 * ver frontend/public/assets/email/) y la mascota desde la ruta real del
 * catalogo de avatares — el HTML original apuntaba a rutas que no existen
 * (piqo.es/assets/... en vez de app.piqo.es, y assets/mascota/ en vez de
 * assets/avatars/mascot/). El token de confirmacion viene ya resuelto en
 * verifyUrl, no como variable de plantilla de Resend (ver MailService: el
 * HTML se manda ya construido, no via un template_id de Resend).
 */
function verificationEmailHtml(verifyUrl: string, locale: Locale): string {
  const url = escapeHtml(verifyUrl);
  const c = VERIFICATION_COPY[locale];
  const footer = FOOTER_COPY[locale];
  return `<!DOCTYPE html>
<html lang="${locale}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${c.subject}</title>
<!--[if mso]>
<noscript>
  <xml>
    <o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
</noscript>
<style>
  table { border-collapse: collapse; }
  td, h1, p { font-family: Arial, Helvetica, sans-serif !important; }
</style>
<![endif]-->
<style>
  body, table, td { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
  a { text-decoration: none; }

  @media screen and (max-width: 600px) {
    .piqo-wrap { width: 100% !important; }
    .piqo-pad { padding-left: 22px !important; padding-right: 22px !important; }
    .piqo-h1 { font-size: 24px !important; line-height: 30px !important; }
    .piqo-btn { display: block !important; width: 100% !important; }
  }

  @media (prefers-color-scheme: dark) {
    .piqo-bg { background-color: #121619 !important; }
    .piqo-card { background-color: #1D2426 !important; }
    .piqo-text { color: #F1F0EA !important; }
    .piqo-muted { color: #ADB5B5 !important; }
    .piqo-border { border-color: #232B2E !important; }
  }
</style>
</head>
<body class="piqo-bg" style="margin: 0; padding: 0; background-color: #F4F2EC;">
<!-- preheader -->
<div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #F4F2EC; opacity: 0;">
  ${c.preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="piqo-bg" style="background-color: #F4F2EC;">
<tr>
<td align="center" style="padding: 32px 16px;">

  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="piqo-wrap" style="width: 600px; max-width: 600px;">

    <!-- header -->
    <tr>
      <td class="piqo-pad" style="background-color: #121619; border-radius: 20px 20px 0 0; padding: 32px 40px; text-align: center;">
        <img src="https://app.piqo.es/assets/email/piqo-wordmark-email.png" width="150" height="45" alt="Piqo" style="display: inline-block; width: 150px; height: 45px; border: 0;" />
      </td>
    </tr>

    <!-- card -->
    <tr>
      <td class="piqo-card" style="background-color: #FFFFFF;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="piqo-pad" style="padding: 44px 40px 8px; text-align: center;">
              <img src="https://app.piqo.es/assets/avatars/mascot/celebrando.png" width="72" height="72" alt="${c.mascotAlt}" style="display: inline-block; width: 72px; height: 72px; border-radius: 50%; border: 2px solid #EFE3C8;" />
            </td>
          </tr>
          <tr>
            <td class="piqo-pad piqo-text" style="padding: 20px 40px 0; text-align: center; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 26px; line-height: 32px; font-weight: 800; color: #121619;">
              <h1 class="piqo-h1" style="margin: 0; font-size: 26px; line-height: 32px; font-weight: 800; color: #121619;">${c.heading}</h1>
            </td>
          </tr>
          <tr>
            <td class="piqo-pad piqo-muted" style="padding: 14px 40px 0; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 26px; color: #6B6459;">
              ${c.body}
            </td>
          </tr>
          <tr>
            <td class="piqo-pad" style="padding: 32px 40px 8px; text-align: center;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${url}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="27%" fillcolor="#D2BE94" stroke="f">
              <w:anchorlock/>
              <center style="color:#121619;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${c.button}</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${url}" class="piqo-btn" style="display: inline-block; background-color: #D2BE94; color: #121619; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 16px; font-weight: 700; padding: 16px 36px; border-radius: 14px; text-decoration: none;">${c.button}</a>
              <!--<![endif]-->
            </td>
          </tr>
          <tr>
            <td class="piqo-pad piqo-muted" style="padding: 20px 40px 0; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 20px; color: #8A8272;">
              ${c.expiry}
            </td>
          </tr>
          <tr>
            <td class="piqo-pad" style="padding: 28px 40px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top: 1px solid #E3DDCC;">
                <tr><td style="padding-top: 24px;"></td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="piqo-pad piqo-muted" style="padding: 0 40px 0; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 20px; color: #8A8272;">
              ${c.buttonFallback}
            </td>
          </tr>
          <tr>
            <td class="piqo-pad" style="padding: 6px 40px 0; text-align: center; word-break: break-all;">
              <a href="${url}" style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #8A6A34;">${url}</a>
            </td>
          </tr>
          <tr>
            <td class="piqo-pad piqo-muted" style="padding: 28px 40px 40px; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 20px; color: #8A8272;">
              ${c.ignore}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- footer -->
    <tr>
      <td style="background-color: #0E1215; border-radius: 0 0 20px 20px; padding: 28px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding-bottom: 10px;">
              <img src="https://app.piqo.es/assets/email/piqo-isotipo-email.png" width="22" height="20" alt="" style="display: inline-block; width: 22px; height: 20px; border: 0; vertical-align: middle; margin-right: 6px;" /><span style="font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 15px; font-weight: 700; color: #D2BE94; vertical-align: middle;">Piqo</span>
            </td>
          </tr>
          <tr>
            <td align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 18px; color: #7C878D; padding-bottom: 10px;">
              ${footer.tagline}
            </td>
          </tr>
          <tr>
            <td align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 17px; color: #5C6467; padding-bottom: 6px;">
              ${footer.notOperator}
            </td>
          </tr>
          <tr>
            <td align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 17px; color: #5C6467;">
              © 2026 Piqo · <a href="https://piqo.es" style="color: #7C878D;">piqo.es</a> · <a href="mailto:support@piqo.es" style="color: #7C878D;">support@piqo.es</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

  </table>

</td>
</tr>
</table>
</body>
</html>`;
}
