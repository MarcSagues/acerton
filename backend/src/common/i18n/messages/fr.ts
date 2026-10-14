/**
 * Mensajes de error en French: la clave es el texto en espanol tal como esta
 * escrito en el codigo (ver error-messages.ts).
 */
export const messages: Record<string, string> = {
  'Quiz no encontrado': 'Quiz introuvable',
  'El quiz ya está cerrado': 'Le quiz est déjà fermé',
  'El quiz todavía no está abierto': 'Le quiz n’est pas encore ouvert',
  'Respuesta de quiz no válida': 'Réponse au quiz non valide',
  'Contesta todas las preguntas del quiz': 'Répondez à toutes les questions du quiz',
  'Temporada de quiz no válida': 'Saison du quiz non valide',
  'Falta el refresh token': 'Le jeton d’actualisation est manquant',
  'Ya existe una cuenta con ese email': 'Un compte existe déjà avec cet e-mail',
  'Credenciales inválidas': 'Identifiants invalides',
  'Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.':
    'Confirme ton e-mail avant de te connecter. Vérifie ta boîte de réception.',
  'El enlace de confirmación no es válido o ha caducado':
    'Le lien de confirmation n’est pas valide ou a expiré',
  'El enlace para restablecer la contraseña no es válido o ha caducado':
    'Le lien de réinitialisation du mot de passe n’est pas valide ou a expiré',
  'Usuario no encontrado': 'Utilisateur introuvable',
  'Esta cuenta usa Google para iniciar sesión y no tiene contraseña que cambiar':
    'Ce compte se connecte avec Google et n’a pas de mot de passe à changer',
  'La contraseña actual no es correcta': 'Le mot de passe actuel est incorrect',
  'Introduce tu contraseña para confirmar': 'Saisis ton mot de passe pour confirmer',
  'La contraseña no es correcta': 'Le mot de passe est incorrect',
  'Token de Google inválido': 'Jeton Google invalide',
  'El token de Google no incluye un email': 'Le jeton Google ne contient pas d’adresse e-mail',
  'Token de Apple inválido': 'Jeton Apple invalide',
  'El token de Apple no incluye un email': 'Le jeton Apple ne contient pas d’adresse e-mail',
  'Refresh token inválido': 'Jeton d’actualisation invalide',
  'Refresh token inválido o expirado': 'Jeton d’actualisation invalide ou expiré',
  'La contraseña debe tener al menos 8 caracteres':
    'Le mot de passe doit contenir au moins 8 caractères',
  'El acceso del dashboard no esta configurado': 'L’accès au tableau de bord n’est pas configuré',
  'Clave del dashboard invalida': 'Clé du tableau de bord invalide',
  'Firebase no esta configurado en este servidor: no se ha enviado nada':
    'Firebase n’est pas configuré sur ce serveur : rien n’a été envoyé',
  'Competición no encontrada': 'Compétition introuvable',
  'Jornada no encontrada': 'Journée introuvable',
  'direction debe ser "previous" o "next"': 'direction doit valoir « previous » ou « next »',
  'Grupo no encontrado': 'Groupe introuvable',
  'Código de invitación inválido': 'Code d’invitation invalide',
  'El grupo es privado, necesitas un link de invitación':
    'Ce groupe est privé : tu as besoin d’un lien d’invitation',
  'No perteneces a este grupo': 'Tu ne fais pas partie de ce groupe',
  'Solo un administrador del grupo puede hacer esto':
    'Seul un administrateur du groupe peut faire cela',
  'Solo el creador del grupo puede hacer esto': 'Seul le créateur du groupe peut faire cela',
  'El creador debe transferir la propiedad o eliminar el grupo antes de salir':
    'Le créateur doit transférer la propriété ou supprimer le groupe avant de partir',
  'Ese usuario no es miembro del grupo': 'Cet utilisateur n’est pas membre du groupe',
  'Ese usuario no es miembro de este grupo': 'Cet utilisateur n’est pas membre de ce groupe',
  'No se puede expulsar a un administrador ni al creador del grupo':
    'Impossible d’exclure un administrateur ou le créateur du groupe',
  'El creador siempre es administrador; transfiere la propiedad para cambiar esto':
    'Le créateur est toujours administrateur : transfère la propriété pour changer cela',
  'Ya eres el propietario de este grupo': 'Tu es déjà propriétaire de ce groupe',
  'El nuevo propietario debe ser ya miembro del grupo':
    'Le nouveau propriétaire doit déjà être membre du groupe',
  'Selecciona al menos una competición': 'Sélectionne au moins une compétition',
  'No se pueden desactivar competiciones ya activadas en el grupo, solo anadir nuevas':
    'Impossible de désactiver des compétitions déjà activées dans le groupe : tu peux seulement en ajouter de nouvelles',
  'Ya eres miembro de este grupo': 'Tu es déjà membre de ce groupe',
  'Partido no encontrado': 'Match introuvable',
  'Este partido ya ha empezado, no se admiten más predicciones':
    'Ce match a déjà commencé, les pronostics ne sont plus acceptés',
  'Todavía no se puede predecir esta jornada, espera a que sea la jornada actual':
    'Cette journée n’est pas encore ouverte aux pronostics, attends qu’elle devienne la journée en cours',
  'Este grupo juega en modo resultado exacto, no admite pronóstico 1X2':
    'Ce groupe joue en mode score exact et n’accepte pas les pronostics 1X2',
  'Falta el resultado exacto (goles local y visitante)':
    'Le score exact est manquant (buts à domicile et à l’extérieur)',
  'Este grupo juega en modo 1X2, no admite resultado exacto':
    'Ce groupe joue en mode 1X2 et n’accepte pas le score exact',
  'Falta el pronóstico 1X2': 'Le pronostic 1X2 est manquant',
  'Elige un grupo distinto del actual': 'Choisis un groupe différent de l’actuel',
  'Solo se puede copiar entre grupos con el mismo modo de juego (1X2 o resultado exacto)':
    'Tu ne peux copier qu’entre des groupes ayant le même mode de jeu (1X2 ou score exact)',
  'Esa jornada no pertenece a una competición activa de este grupo':
    'Cette journée n’appartient à aucune compétition active de ce groupe',
  'Las predicciones del grupo se ven cuando cierra la jornada':
    'Les pronostics du groupe sont visibles une fois la journée clôturée',
  'El comodín de remontada está desactivado en este grupo':
    'Le joker remontada est désactivé dans ce groupe',
  'Esta jornada ya no admite comodines nuevos': 'Cette journée n’accepte plus de nouveaux jokers',
  'No te quedan comodines de remontada disponibles esta jornada':
    'Tu n’as plus de joker remontada disponible cette journée',
  'Tu cuenta ya tiene un referidor asignado': 'Ton compte a déjà un parrain attribué',
  'Código de invitación no válido': 'Code d’invitation non valide',
  'No puedes usar tu propio código': 'Tu ne peux pas utiliser ton propre code',
  'Usa solo letras, números, espacios, guiones y apostrofes':
    'Utilise uniquement des lettres, des chiffres, des espaces, des tirets et des apostrophes',
};

/** Mensajes con datos dentro: `{1}` es lo capturado por el patron del mismo id (ver error-messages.ts). */
export const patterns: Record<string, string> = {
  nameChangeCooldown:
    'Tu ne peux changer ton nom qu’une fois par semaine. Tu pourras le refaire le {1}.',
  mascotLevel: 'Il te faut le niveau {1} pour utiliser cette mascotte.',
  colorLevel: 'Il te faut le niveau {1} pour utiliser cette couleur.',
};
