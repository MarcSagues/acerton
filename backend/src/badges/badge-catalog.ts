/**
 * Catalogo inicial de insignias. Extensible: anadir una entrada aqui y su
 * checker correspondiente en BadgesService.CHECKERS.
 *
 * Fuente unica: la usan prisma/seed.ts y BadgesService.onModuleInit (que
 * asegura el catalogo al arrancar el backend, para que una BD a la que nadie
 * ha pasado el seed no se quede con insignias de menos).
 */
export const BADGE_CATALOG: Array<{ code: string; name: string; description: string }> = [
  {
    code: 'FIRST_MATCHDAY_PLAYED',
    name: 'Primeros pasos',
    description: 'Enviaste tu primera prediccion.',
  },
  {
    code: 'STREAK_5',
    name: 'Racha de 5',
    description: 'Participaste 5 jornadas seguidas.',
  },
  {
    code: 'STREAK_10',
    name: 'Racha de 10',
    description: 'Participaste 10 jornadas seguidas.',
  },
  {
    code: 'HOT_STREAK_5',
    name: 'En racha',
    description: 'Acertaste 5 predicciones seguidas.',
  },
  {
    code: 'MATCHDAY_TOP_1',
    name: 'Jornada perfecta',
    description: 'Quedaste primero en la clasificacion semanal de una jornada.',
  },
  {
    code: 'STREAK_25',
    name: 'Incombustible',
    description: 'Participaste 25 jornadas seguidas.',
  },
  {
    code: 'PREDICTIONS_100',
    name: 'Centenario',
    description: 'Enviaste 100 pronosticos.',
  },
  {
    code: 'ONE_X_TWO_HITS_25',
    name: 'Buen ojo',
    description: 'Acertaste 25 pronosticos 1X2.',
  },
  {
    code: 'ONE_X_TWO_HITS_100',
    name: 'Experto en 1X2',
    description: 'Acertaste 100 pronosticos 1X2.',
  },
  {
    code: 'EXACT_SCORE_HIT_1',
    name: 'Al milímetro',
    description: 'Acertaste un resultado exacto.',
  },
  {
    code: 'EXACT_SCORE_HITS_10',
    name: 'Francotirador',
    description: 'Acertaste 10 resultados exactos.',
  },
  {
    code: 'HOT_STREAK_10',
    name: 'Racha de fuego',
    description: 'Acertaste 10 predicciones seguidas.',
  },
  {
    code: 'PREDICTIONS_500',
    name: 'Leyenda',
    description: 'Enviaste 500 pronosticos.',
  },
  {
    code: 'PERFECT_MATCHDAY',
    name: 'Pleno',
    description: 'Acertaste todos los partidos de una jornada.',
  },
  {
    code: 'WILDCARD_HITS_5',
    name: 'Comodín de oro',
    description: 'El comodín de remontada te dio puntos 5 veces.',
  },
  {
    code: 'GROUPS_JOINED_3',
    name: 'Sociable',
    description: 'Formas parte de 3 grupos a la vez.',
  },
  {
    code: 'DRAW_HITS_10',
    name: 'Especialista en empates',
    description: 'Acertaste 10 empates.',
  },
  {
    code: 'COMPETITIONS_3',
    name: 'Multiliga',
    description: 'Pronosticaste en 3 ligas distintas.',
  },
  {
    code: 'GROUP_FOUNDER',
    name: 'Fundador',
    description: 'Creaste un grupo.',
  },
  {
    code: 'PODIUM_5',
    name: 'En el podio',
    description: 'Quedaste entre los 3 primeros de la semana, 5 veces.',
  },
];
