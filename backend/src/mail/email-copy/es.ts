import type { LocaleEmailCopy } from './types';

export const copy: LocaleEmailCopy = {
  verification: {
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
  reset: {
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
  footer: {
    tagline:
      'La app para hacer la porra de fútbol con tu grupo.<br/>Sin dinero, sin apuestas y sin hojas de cálculo.',
    notOperator: 'Piqo no es un operador de juego. No se admiten apuestas ni premios en metálico.',
  },
};
