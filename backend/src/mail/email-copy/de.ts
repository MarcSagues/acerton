import type { LocaleEmailCopy } from './types';

export const copy: LocaleEmailCopy = {
  verification: {
    subject: 'Bestätige deine E-Mail-Adresse bei Piqo',
    preheader:
      'Noch ein Schritt, dann kannst du deine Gruppe erstellen und das Tippspiel mit deinen Freunden starten.',
    mascotAlt: 'Piqo-Maskottchen beim Jubeln',
    heading: 'Bestätige deine E-Mail-Adresse',
    body: 'Danke, dass du dein Piqo-Konto erstellt hast. Bestätige deine E-Mail-Adresse, um es zu aktivieren – dann kannst du deine Gruppe erstellen, einen Wettbewerb wählen und den Link mit deinen Freunden teilen.',
    button: 'E-Mail bestätigen',
    expiry: 'Dieser Link läuft in 24 Stunden ab.',
    buttonFallback:
      'Der Button funktioniert nicht? Kopiere diesen Link und füge ihn in deinen Browser ein:',
    ignore: 'Wenn du kein Piqo-Konto erstellt hast, kannst du diese E-Mail ignorieren.',
  },
  reset: {
    subject: 'Setze dein Piqo-Passwort zurück',
    preheader: 'Dieser Link zum Zurücksetzen deines Passworts läuft in 60 Minuten ab.',
    mascotAlt: 'Piqo-Maskottchen beim Nachdenken',
    heading: 'Passwort vergessen?',
    body: 'Wir haben eine Anfrage erhalten, das Passwort deines Piqo-Kontos zurückzusetzen. Tippe auf den Button unten, um ein neues Passwort festzulegen.',
    button: 'Passwort zurücksetzen',
    expiry: 'Dieser Link läuft aus Sicherheitsgründen in 60 Minuten ab.',
    buttonFallback:
      'Der Button funktioniert nicht? Kopiere diesen Link und füge ihn in deinen Browser ein:',
    ignore:
      'Wenn du diese Änderung nicht angefordert hast, kannst du diese E-Mail ignorieren: Dein Passwort bleibt unverändert.',
  },
  footer: {
    tagline:
      'Die App fürs Fußball-Tippspiel mit deiner Gruppe.<br/>Ohne Geld, ohne Wetten und ohne Excel-Chaos.',
    notOperator: 'Piqo ist kein Glücksspielanbieter. Wetten und Geldpreise sind nicht zulässig.',
  },
};
