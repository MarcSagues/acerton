import type { LocaleEmailCopy } from './types';

export const copy: LocaleEmailCopy = {
  verification: {
    subject: 'Conferma la tua email su Piqo',
    preheader:
      'Ancora un passo e potrai creare il tuo gruppo e organizzare la sfida dei pronostici con i tuoi amici.',
    mascotAlt: 'Mascotte di Piqo che festeggia',
    heading: 'Conferma il tuo indirizzo email',
    body: 'Grazie per aver creato il tuo account su Piqo. Conferma la tua email per attivarlo e poter creare il tuo gruppo, scegliere la competizione e condividere il link con i tuoi amici.',
    button: 'Conferma la mia email',
    expiry: 'Questo link scade tra 24 ore.',
    buttonFallback: 'Il pulsante non funziona? Copia e incolla questo link nel tuo browser:',
    ignore: 'Se non hai creato un account su Piqo, puoi ignorare questa email.',
  },
  reset: {
    subject: 'Reimposta la tua password di Piqo',
    preheader: 'Questo link per reimpostare la tua password scade tra 60 minuti.',
    mascotAlt: 'Mascotte di Piqo che pensa',
    heading: 'Hai dimenticato la password?',
    body: 'Abbiamo ricevuto una richiesta per reimpostare la password del tuo account su Piqo. Premi il pulsante qui sotto per creare una nuova password.',
    button: 'Reimposta password',
    expiry: 'Per sicurezza, questo link scade tra 60 minuti.',
    buttonFallback: 'Il pulsante non funziona? Copia e incolla questo link nel tuo browser:',
    ignore:
      'Se non hai richiesto questa modifica, puoi ignorare questa email: la tua password resterà la stessa.',
  },
  footer: {
    tagline:
      'L’app per sfidarti sui pronostici di calcio con il tuo gruppo.<br/>Senza soldi, senza scommesse e senza fogli di calcolo.',
    notOperator: 'Piqo non è un operatore di gioco. Non sono ammesse scommesse né premi in denaro.',
  },
};
