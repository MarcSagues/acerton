/**
 * Mensajes de error en Catalan: la clave es el texto en espanol tal como esta
 * escrito en el codigo (ver error-messages.ts).
 */
export const messages: Record<string, string> = {
  // mantenimiento
  'Piqo está en mantenimiento. Vuelve a intentarlo en un rato.':
    'Piqo està en manteniment. Torna-ho a provar d’aquí a una estona.',
  'Quiz no encontrado': 'No s’ha trobat el quiz',
  'El quiz ya está cerrado': 'El quiz ja està tancat',
  'El quiz todavía no está abierto': 'El quiz encara no està obert',
  'Respuesta de quiz no válida': 'Resposta del quiz no vàlida',
  'Contesta todas las preguntas del quiz': 'Respon totes les preguntes del quiz',
  'Temporada de quiz no válida': 'Temporada del quiz no vàlida',
  'Falta el refresh token': 'Falta el refresh token',
  'Ya existe una cuenta con ese email': 'Ja existeix un compte amb aquest correu',
  'Credenciales inválidas': 'Credencials no vàlides',
  'Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.':
    'Confirma el teu correu abans d’iniciar sessió. Revisa la safata d’entrada.',
  'El enlace de confirmación no es válido o ha caducado':
    'L’enllaç de confirmació no és vàlid o ha caducat',
  'El enlace para restablecer la contraseña no es válido o ha caducado':
    'L’enllaç per restablir la contrasenya no és vàlid o ha caducat',
  'Usuario no encontrado': 'Usuari no trobat',
  'Esta cuenta usa Google para iniciar sesión y no tiene contraseña que cambiar':
    'Aquest compte fa servir Google per iniciar sessió i no té cap contrasenya per canviar',
  'La contraseña actual no es correcta': 'La contrasenya actual no és correcta',
  'Introduce tu contraseña para confirmar': 'Introdueix la teva contrasenya per confirmar',
  'La contraseña no es correcta': 'La contrasenya no és correcta',
  'Token de Google inválido': 'Token de Google no vàlid',
  'El token de Google no incluye un email': 'El token de Google no inclou cap correu',
  'Token de Apple inválido': 'Token d’Apple no vàlid',
  'El token de Apple no incluye un email': 'El token d’Apple no inclou cap correu',
  'Refresh token inválido': 'Refresh token no vàlid',
  'Refresh token inválido o expirado': 'Refresh token no vàlid o caducat',
  'La contraseña debe tener al menos 8 caracteres':
    'La contrasenya ha de tenir almenys 8 caràcters',
  'El acceso del dashboard no esta configurado': 'L’accés al tauler de control no està configurat',
  'Clave del dashboard invalida': 'Clau del tauler de control no vàlida',
  'Firebase no esta configurado en este servidor: no se ha enviado nada':
    'Firebase no està configurat en aquest servidor: no s’ha enviat res',
  'Competición no encontrada': 'Competició no trobada',
  'Jornada no encontrada': 'Jornada no trobada',
  'direction debe ser "previous" o "next"': 'direction ha de ser «previous» o «next»',
  'Grupo no encontrado': 'Grup no trobat',
  'Código de invitación inválido': 'Codi d’invitació no vàlid',
  'El grupo es privado, necesitas un link de invitación':
    'El grup és privat, necessites un enllaç d’invitació',
  'No perteneces a este grupo': 'No pertanys a aquest grup',
  'Solo un administrador del grupo puede hacer esto': 'Només un administrador del grup ho pot fer',
  'Solo el creador del grupo puede hacer esto': 'Només el creador del grup ho pot fer',
  'El creador debe transferir la propiedad o eliminar el grupo antes de salir':
    'El creador ha de transferir la propietat o eliminar el grup abans de sortir',
  'Ese usuario no es miembro del grupo': 'Aquest usuari no és membre del grup',
  'Ese usuario no es miembro de este grupo': 'Aquest usuari no és membre d’aquest grup',
  'No se puede expulsar a un administrador ni al creador del grupo':
    'No es pot expulsar un administrador ni el creador del grup',
  'El creador siempre es administrador; transfiere la propiedad para cambiar esto':
    'El creador sempre és administrador; transfereix la propietat per canviar-ho',
  'Ya eres el propietario de este grupo': 'Ja ets el propietari d’aquest grup',
  'El nuevo propietario debe ser ya miembro del grupo':
    'El nou propietari ha de ser ja membre del grup',
  'Selecciona al menos una competición': 'Selecciona almenys una competició',
  'No se pueden desactivar competiciones ya activadas en el grupo, solo anadir nuevas':
    'No es poden desactivar les competicions ja activades al grup, només afegir-ne de noves',
  'Ya eres miembro de este grupo': 'Ja ets membre d’aquest grup',
  'Partido no encontrado': 'Partit no trobat',
  'Este partido ya ha empezado, no se admiten más predicciones':
    'Aquest partit ja ha començat, no s’admeten més pronòstics',
  'Todavía no se puede predecir esta jornada, espera a que sea la jornada actual':
    'Encara no es pot pronosticar aquesta jornada, espera que sigui la jornada actual',
  'Este grupo juega en modo resultado exacto, no admite pronóstico 1X2':
    'Aquest grup juga en mode resultat exacte i no admet pronòstic 1X2',
  'Falta el resultado exacto (goles local y visitante)':
    'Falta el resultat exacte (gols del local i del visitant)',
  'Este grupo juega en modo 1X2, no admite resultado exacto':
    'Aquest grup juga en mode 1X2 i no admet resultat exacte',
  'Falta el pronóstico 1X2': 'Falta el pronòstic 1X2',
  'Elige un grupo distinto del actual': 'Tria un grup diferent de l’actual',
  'Solo se puede copiar entre grupos con el mismo modo de juego (1X2 o resultado exacto)':
    'Només es pot copiar entre grups amb el mateix mode de joc (1X2 o resultat exacte)',
  'Esa jornada no pertenece a una competición activa de este grupo':
    'Aquesta jornada no pertany a cap competició activa d’aquest grup',
  'Las predicciones del grupo se ven cuando cierra la jornada':
    'Els pronòstics del grup es veuen quan es tanca la jornada',
  'El comodín de remontada está desactivado en este grupo':
    'El comodí de remuntada està desactivat en aquest grup',
  'Esta jornada ya no admite comodines nuevos': 'Aquesta jornada ja no admet comodins nous',
  'No te quedan comodines de remontada disponibles esta jornada':
    'No et queden comodins de remuntada disponibles aquesta jornada',
  'Tu cuenta ya tiene un referidor asignado': 'El teu compte ja té assignat qui t’ha convidat',
  'Código de invitación no válido': 'Codi d’invitació no vàlid',
  'No puedes usar tu propio código': 'No pots fer servir el teu propi codi',
  'Usa solo letras, números, espacios, guiones y apostrofes':
    'Fes servir només lletres, números, espais, guions i apòstrofs',
};

/** Mensajes con datos dentro: `{1}` es lo capturado por el patron del mismo id (ver error-messages.ts). */
export const patterns: Record<string, string> = {
  nameChangeCooldown:
    'Només pots canviar el nom un cop per setmana. Podràs tornar-ho a fer el {1}.',
  mascotLevel: 'Necessites el nivell {1} per fer servir aquesta mascota.',
  colorLevel: 'Necessites el nivell {1} per fer servir aquest color.',
};
