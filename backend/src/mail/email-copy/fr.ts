import type { LocaleEmailCopy } from './types';

export const copy: LocaleEmailCopy = {
  verification: {
    subject: 'Confirme ton e-mail sur Piqo',
    preheader:
      'Encore une étape et tu pourras créer ton groupe et lancer vos pronos avec ta bande.',
    mascotAlt: 'Mascotte de Piqo qui fête ça',
    heading: 'Confirme ton adresse e-mail',
    body: 'Merci d’avoir créé ton compte Piqo. Confirme ton e-mail pour l’activer et pouvoir créer ton groupe, choisir une compétition et partager le lien avec ta bande.',
    button: 'Confirmer mon e-mail',
    expiry: 'Ce lien expire dans 24 heures.',
    buttonFallback: 'Le bouton ne fonctionne pas ? Copie et colle ce lien dans ton navigateur :',
    ignore: 'Si tu n’as pas créé de compte Piqo, tu peux ignorer cet e-mail.',
  },
  reset: {
    subject: 'Réinitialise ton mot de passe Piqo',
    preheader: 'Ce lien pour réinitialiser ton mot de passe expire dans 60 minutes.',
    mascotAlt: 'Mascotte de Piqo qui réfléchit',
    heading: 'Mot de passe oublié ?',
    body: 'Nous avons reçu une demande de réinitialisation du mot de passe de ton compte Piqo. Appuie sur le bouton ci-dessous pour créer un nouveau mot de passe.',
    button: 'Réinitialiser le mot de passe',
    expiry: 'Ce lien expire dans 60 minutes, par sécurité.',
    buttonFallback: 'Le bouton ne fonctionne pas ? Copie et colle ce lien dans ton navigateur :',
    ignore:
      'Si tu n’as pas fait cette demande, tu peux ignorer cet e-mail : ton mot de passe ne changera pas.',
  },
  footer: {
    tagline:
      'L’app pour organiser tes pronos de foot avec ton groupe.<br/>Sans argent, sans paris et sans tableurs.',
    notOperator:
      'Piqo n’est pas un opérateur de jeux d’argent. Les paris et les gains en espèces ne sont pas admis.',
  },
};
