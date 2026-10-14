import type { LocaleEmailCopy } from './types';

export const copy: LocaleEmailCopy = {
  verification: {
    subject: 'Confirma el teu correu a Piqo',
    preheader: 'Un pas més i ja pots crear el teu grup i muntar la porra amb la teva colla.',
    mascotAlt: 'Mascota de Piqo celebrant',
    heading: 'Confirma el teu correu electrònic',
    body: 'Gràcies per crear el teu compte a Piqo. Confirma el teu correu per activar-lo i poder crear el teu grup, triar competició i compartir l’enllaç amb la teva colla.',
    button: 'Confirmar el meu correu',
    expiry: 'Aquest enllaç caduca en 24 hores.',
    buttonFallback: 'No et funciona el botó? Copia i enganxa aquest enllaç al navegador:',
    ignore: 'Si no has creat cap compte a Piqo, pots ignorar aquest correu.',
  },
  reset: {
    subject: 'Restableix la teva contrasenya de Piqo',
    preheader: 'Aquest enllaç per restablir la teva contrasenya caduca en 60 minuts.',
    mascotAlt: 'Mascota de Piqo pensant',
    heading: 'Has oblidat la contrasenya?',
    body: 'Hem rebut una sol·licitud per restablir la contrasenya del teu compte de Piqo. Prem el botó de sota per crear una contrasenya nova.',
    button: 'Restablir la contrasenya',
    expiry: 'Aquest enllaç caduca en 60 minuts per seguretat.',
    buttonFallback: 'No et funciona el botó? Copia i enganxa aquest enllaç al navegador:',
    ignore:
      'Si no has sol·licitat aquest canvi, pots ignorar aquest correu: la teva contrasenya continuarà sent la mateixa.',
  },
  footer: {
    tagline:
      'L’app per fer la porra de futbol amb el teu grup.<br/>Sense diners, sense apostes i sense fulls de càlcul.',
    notOperator: 'Piqo no és un operador de joc. No s’admeten apostes ni premis en metàl·lic.',
  },
};
