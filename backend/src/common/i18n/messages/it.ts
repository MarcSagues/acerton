/**
 * Mensajes de error en Italian: la clave es el texto en espanol tal como esta
 * escrito en el codigo (ver error-messages.ts).
 */
export const messages: Record<string, string> = {
  // mantenimiento
  'Piqo está en mantenimiento. Vuelve a intentarlo en un rato.':
    'Piqo è in manutenzione. Riprova tra un po’.',
  'Quiz no encontrado': 'Quiz non trovato',
  'El quiz ya está cerrado': 'Il quiz è già chiuso',
  'El quiz todavía no está abierto': 'Il quiz non è ancora aperto',
  'Respuesta de quiz no válida': 'Risposta al quiz non valida',
  'Contesta todas las preguntas del quiz': 'Rispondi a tutte le domande del quiz',
  'Temporada de quiz no válida': 'Stagione del quiz non valida',
  'Falta el refresh token': 'Manca il refresh token',
  'Ya existe una cuenta con ese email': 'Esiste già un account con questa email',
  'Credenciales inválidas': 'Credenziali non valide',
  'Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.':
    'Conferma la tua email prima di accedere. Controlla la posta in arrivo.',
  'El enlace de confirmación no es válido o ha caducado':
    'Il link di conferma non è valido o è scaduto',
  'El enlace para restablecer la contraseña no es válido o ha caducado':
    'Il link per reimpostare la password non è valido o è scaduto',
  'Usuario no encontrado': 'Utente non trovato',
  'Esta cuenta usa Google para iniciar sesión y no tiene contraseña que cambiar':
    'Questo account accede con Google e non ha una password da cambiare',
  'La contraseña actual no es correcta': 'La password attuale non è corretta',
  'Introduce tu contraseña para confirmar': 'Inserisci la tua password per confermare',
  'La contraseña no es correcta': 'La password non è corretta',
  'Token de Google inválido': 'Token di Google non valido',
  'El token de Google no incluye un email': 'Il token di Google non include un’email',
  'Token de Apple inválido': 'Token di Apple non valido',
  'El token de Apple no incluye un email': 'Il token di Apple non include un’email',
  'Refresh token inválido': 'Refresh token non valido',
  'Refresh token inválido o expirado': 'Refresh token non valido o scaduto',
  'La contraseña debe tener al menos 8 caracteres': 'La password deve avere almeno 8 caratteri',
  'El acceso del dashboard no esta configurado': 'L’accesso alla dashboard non è configurato',
  'Clave del dashboard invalida': 'Chiave della dashboard non valida',
  'Firebase no esta configurado en este servidor: no se ha enviado nada':
    'Firebase non è configurato su questo server: non è stato inviato nulla',
  'Competición no encontrada': 'Competizione non trovata',
  'Jornada no encontrada': 'Giornata non trovata',
  'direction debe ser "previous" o "next"': 'direction deve essere «previous» o «next»',
  'Grupo no encontrado': 'Gruppo non trovato',
  'Código de invitación inválido': 'Codice d’invito non valido',
  'El grupo es privado, necesitas un link de invitación':
    'Il gruppo è privato, ti serve un link d’invito',
  'No perteneces a este grupo': 'Non fai parte di questo gruppo',
  'Solo un administrador del grupo puede hacer esto': 'Solo un amministratore del gruppo può farlo',
  'Solo el creador del grupo puede hacer esto': 'Solo il creatore del gruppo può farlo',
  'El creador debe transferir la propiedad o eliminar el grupo antes de salir':
    'Il creatore deve trasferire la proprietà o eliminare il gruppo prima di uscire',
  'Ese usuario no es miembro del grupo': 'Quell’utente non è membro del gruppo',
  'Ese usuario no es miembro de este grupo': 'Quell’utente non è membro di questo gruppo',
  'No se puede expulsar a un administrador ni al creador del grupo':
    'Non si può espellere un amministratore né il creatore del gruppo',
  'El creador siempre es administrador; transfiere la propiedad para cambiar esto':
    'Il creatore è sempre amministratore: trasferisci la proprietà per cambiare questa cosa',
  'Ya eres el propietario de este grupo': 'Sei già il proprietario di questo gruppo',
  'El nuevo propietario debe ser ya miembro del grupo':
    'Il nuovo proprietario deve già essere membro del gruppo',
  'Selecciona al menos una competición': 'Seleziona almeno una competizione',
  'No se pueden desactivar competiciones ya activadas en el grupo, solo anadir nuevas':
    'Le competizioni già attivate nel gruppo non si possono disattivare, solo aggiungerne di nuove',
  'Ya eres miembro de este grupo': 'Sei già membro di questo gruppo',
  'Partido no encontrado': 'Partita non trovata',
  'Este partido ya ha empezado, no se admiten más predicciones':
    'Questa partita è già iniziata, non si accettano più pronostici',
  'Todavía no se puede predecir esta jornada, espera a que sea la jornada actual':
    'Questa giornata non si può ancora pronosticare: aspetta che diventi la giornata attuale',
  'Este grupo juega en modo resultado exacto, no admite pronóstico 1X2':
    'Questo gruppo gioca in modalità risultato esatto e non ammette pronostici 1X2',
  'Falta el resultado exacto (goles local y visitante)':
    'Manca il risultato esatto (gol di casa e ospite)',
  'Este grupo juega en modo 1X2, no admite resultado exacto':
    'Questo gruppo gioca in modalità 1X2 e non ammette il risultato esatto',
  'Falta el pronóstico 1X2': 'Manca il pronostico 1X2',
  'Elige un grupo distinto del actual': 'Scegli un gruppo diverso da quello attuale',
  'Solo se puede copiar entre grupos con el mismo modo de juego (1X2 o resultado exacto)':
    'Si può copiare solo tra gruppi con la stessa modalità di gioco (1X2 o risultato esatto)',
  'Esa jornada no pertenece a una competición activa de este grupo':
    'Quella giornata non appartiene a una competizione attiva di questo gruppo',
  'Las predicciones del grupo se ven cuando cierra la jornada':
    'I pronostici del gruppo si vedono quando la giornata chiude',
  'El comodín de remontada está desactivado en este grupo':
    'Il jolly rimonta è disattivato in questo gruppo',
  'Esta jornada ya no admite comodines nuevos': 'Questa giornata non accetta più nuovi jolly',
  'No te quedan comodines de remontada disponibles esta jornada':
    'Non ti restano jolly rimonta disponibili in questa giornata',
  'Tu cuenta ya tiene un referidor asignado': 'Al tuo account è già associato chi ti ha invitato',
  'Código de invitación no válido': 'Codice d’invito non valido',
  'No puedes usar tu propio código': 'Non puoi usare il tuo stesso codice',
  'Usa solo letras, números, espacios, guiones y apostrofes':
    'Usa solo lettere, numeri, spazi, trattini e apostrofi',
};

/** Mensajes con datos dentro: `{1}` es lo capturado por el patron del mismo id (ver error-messages.ts). */
export const patterns: Record<string, string> = {
  nameChangeCooldown:
    'Puoi cambiare il nome solo una volta a settimana. Potrai farlo di nuovo il {1}.',
  mascotLevel: 'Ti serve il livello {1} per usare questa mascotte.',
  colorLevel: 'Ti serve il livello {1} per usare questo colore.',
};
