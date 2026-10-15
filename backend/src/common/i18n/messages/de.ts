/**
 * Mensajes de error en German: la clave es el texto en espanol tal como esta
 * escrito en el codigo (ver error-messages.ts).
 */
export const messages: Record<string, string> = {
  // mantenimiento
  'Piqo está en mantenimiento. Vuelve a intentarlo en un rato.':
    'Piqo wird gerade gewartet. Versuch es in einer Weile noch einmal.',
  'Quiz no encontrado': 'Quiz nicht gefunden',
  'El quiz ya está cerrado': 'Das Quiz ist bereits geschlossen',
  'El quiz todavía no está abierto': 'Das Quiz ist noch nicht geöffnet',
  'Respuesta de quiz no válida': 'Ungültige Quizantwort',
  'Contesta todas las preguntas del quiz': 'Beantworte alle Quizfragen',
  'Temporada de quiz no válida': 'Ungültige Quizsaison',
  'Falta el refresh token': 'Das Refresh-Token fehlt',
  'Ya existe una cuenta con ese email': 'Es gibt bereits ein Konto mit dieser E-Mail-Adresse',
  'Credenciales inválidas': 'Ungültige Zugangsdaten',
  'Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.':
    'Bestätige deine E-Mail-Adresse, bevor du dich anmeldest. Schau in dein Postfach.',
  'El enlace de confirmación no es válido o ha caducado':
    'Der Bestätigungslink ist ungültig oder abgelaufen',
  'El enlace para restablecer la contraseña no es válido o ha caducado':
    'Der Link zum Zurücksetzen des Passworts ist ungültig oder abgelaufen',
  'Usuario no encontrado': 'Benutzer nicht gefunden',
  'Esta cuenta usa Google para iniciar sesión y no tiene contraseña que cambiar':
    'Dieses Konto meldet sich über Google an und hat kein Passwort, das geändert werden könnte',
  'La contraseña actual no es correcta': 'Das aktuelle Passwort ist nicht korrekt',
  'Introduce tu contraseña para confirmar': 'Gib zur Bestätigung dein Passwort ein',
  'La contraseña no es correcta': 'Das Passwort ist nicht korrekt',
  'Token de Google inválido': 'Ungültiges Google-Token',
  'El token de Google no incluye un email': 'Das Google-Token enthält keine E-Mail-Adresse',
  'Token de Apple inválido': 'Ungültiges Apple-Token',
  'El token de Apple no incluye un email': 'Das Apple-Token enthält keine E-Mail-Adresse',
  'Refresh token inválido': 'Ungültiges Refresh-Token',
  'Refresh token inválido o expirado': 'Ungültiges oder abgelaufenes Refresh-Token',
  'La contraseña debe tener al menos 8 caracteres':
    'Das Passwort muss mindestens 8 Zeichen lang sein',
  'El acceso del dashboard no esta configurado': 'Der Dashboard-Zugang ist nicht eingerichtet',
  'Clave del dashboard invalida': 'Ungültiger Dashboard-Schlüssel',
  'Firebase no esta configurado en este servidor: no se ha enviado nada':
    'Firebase ist auf diesem Server nicht eingerichtet: Es wurde nichts gesendet',
  'Competición no encontrada': 'Wettbewerb nicht gefunden',
  'Jornada no encontrada': 'Spieltag nicht gefunden',
  'direction debe ser "previous" o "next"': 'direction muss „previous“ oder „next“ sein',
  'Grupo no encontrado': 'Gruppe nicht gefunden',
  'Código de invitación inválido': 'Ungültiger Einladungscode',
  'El grupo es privado, necesitas un link de invitación':
    'Die Gruppe ist privat, du brauchst einen Einladungslink',
  'No perteneces a este grupo': 'Du gehörst nicht zu dieser Gruppe',
  'Solo un administrador del grupo puede hacer esto':
    'Das kann nur ein Administrator der Gruppe tun',
  'Solo el creador del grupo puede hacer esto': 'Das kann nur der Ersteller der Gruppe tun',
  'El creador debe transferir la propiedad o eliminar el grupo antes de salir':
    'Der Ersteller muss das Eigentum übertragen oder die Gruppe löschen, bevor er sie verlässt',
  'Ese usuario no es miembro del grupo': 'Dieser Benutzer ist kein Mitglied der Gruppe',
  'Ese usuario no es miembro de este grupo': 'Dieser Benutzer ist kein Mitglied dieser Gruppe',
  'No se puede expulsar a un administrador ni al creador del grupo':
    'Ein Administrator oder der Ersteller der Gruppe kann nicht entfernt werden',
  'El creador siempre es administrador; transfiere la propiedad para cambiar esto':
    'Der Ersteller ist immer Administrator; übertrage das Eigentum, um das zu ändern',
  'Ya eres el propietario de este grupo': 'Du bist bereits der Eigentümer dieser Gruppe',
  'El nuevo propietario debe ser ya miembro del grupo':
    'Der neue Eigentümer muss bereits Mitglied der Gruppe sein',
  'Selecciona al menos una competición': 'Wähle mindestens einen Wettbewerb aus',
  'No se pueden desactivar competiciones ya activadas en el grupo, solo anadir nuevas':
    'Bereits aktivierte Wettbewerbe der Gruppe können nicht deaktiviert werden, es können nur neue hinzugefügt werden',
  'Ya eres miembro de este grupo': 'Du bist schon Mitglied dieser Gruppe',
  'Partido no encontrado': 'Spiel nicht gefunden',
  'Este partido ya ha empezado, no se admiten más predicciones':
    'Dieses Spiel hat schon begonnen, es werden keine Tipps mehr angenommen',
  'Todavía no se puede predecir esta jornada, espera a que sea la jornada actual':
    'Dieser Spieltag kann noch nicht getippt werden, warte, bis er der aktuelle Spieltag ist',
  'Este grupo juega en modo resultado exacto, no admite pronóstico 1X2':
    'Diese Gruppe spielt im Modus „Exaktes Ergebnis“ und nimmt keinen 1X2-Tipp an',
  'Falta el resultado exacto (goles local y visitante)':
    'Das exakte Ergebnis fehlt (Tore Heim und Auswärts)',
  'Este grupo juega en modo 1X2, no admite resultado exacto':
    'Diese Gruppe spielt im Modus 1X2 und nimmt kein exaktes Ergebnis an',
  'Falta el pronóstico 1X2': 'Der 1X2-Tipp fehlt',
  'Elige un grupo distinto del actual': 'Wähle eine andere Gruppe als die aktuelle',
  'Solo se puede copiar entre grupos con el mismo modo de juego (1X2 o resultado exacto)':
    'Du kannst nur zwischen Gruppen mit demselben Spielmodus kopieren (1X2 oder exaktes Ergebnis)',
  'Esa jornada no pertenece a una competición activa de este grupo':
    'Dieser Spieltag gehört zu keinem aktiven Wettbewerb dieser Gruppe',
  'Las predicciones del grupo se ven cuando cierra la jornada':
    'Die Tipps der Gruppe sind sichtbar, sobald der Spieltag geschlossen ist',
  'El comodín de remontada está desactivado en este grupo':
    'Der Comeback-Joker ist in dieser Gruppe deaktiviert',
  'Esta jornada ya no admite comodines nuevos': 'Dieser Spieltag nimmt keine neuen Joker mehr an',
  'No te quedan comodines de remontada disponibles esta jornada':
    'Du hast an diesem Spieltag keine Comeback-Joker mehr',
  'Tu cuenta ya tiene un referidor asignado':
    'Dein Konto ist bereits mit einer Einladung verknüpft',
  'Código de invitación no válido': 'Ungültiger Einladungscode',
  'No puedes usar tu propio código': 'Du kannst deinen eigenen Code nicht verwenden',
  'Usa solo letras, números, espacios, guiones y apostrofes':
    'Verwende nur Buchstaben, Zahlen, Leerzeichen, Bindestriche und Apostrophe',
};

/** Mensajes con datos dentro: `{1}` es lo capturado por el patron del mismo id (ver error-messages.ts). */
export const patterns: Record<string, string> = {
  nameChangeCooldown:
    'Du kannst deinen Namen nur einmal pro Woche ändern. Am {1} kannst du es wieder tun.',
  mascotLevel: 'Du brauchst Level {1}, um dieses Maskottchen zu verwenden.',
  colorLevel: 'Du brauchst Level {1}, um diese Farbe zu verwenden.',
};
