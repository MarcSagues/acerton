import { PrismaClient, CompetitionCode } from '@prisma/client';
import { getCurrentFootballSeason } from '../src/common/season.util';

const prisma = new PrismaClient();

/**
 * Ids de competicion en football-data.org (proveedor activo, ver
 * FootballDataOrgProvider). Referencia: GET /v4/competitions.
 *
 * OJO: football-data.org solo cubre 13 competiciones en total (ninguna paga
 * de mas), y la UEFA Conference League no es una de ellas — no hay id valido
 * que poner. Se deja en el catalogo por completitud (un grupo puede
 * "activarla" en la UI) pero su sincronizacion nunca traera partidos.
 */
const CONFERENCE_LEAGUE_NOT_COVERED_BY_PROVIDER = 0;

const COMPETITIONS: Array<{
  code: CompetitionCode;
  name: string;
  externalId: number;
}> = [
  { code: 'PREMIER_LEAGUE', name: 'Premier League', externalId: 2021 },
  { code: 'LA_LIGA', name: 'La Liga', externalId: 2014 },
  { code: 'SERIE_A', name: 'Serie A', externalId: 2019 },
  { code: 'BUNDESLIGA', name: 'Bundesliga', externalId: 2002 },
  { code: 'LIGUE_1', name: 'Ligue 1', externalId: 2015 },
  { code: 'CHAMPIONS_LEAGUE', name: 'UEFA Champions League', externalId: 2001 },
  {
    code: 'CONFERENCE_LEAGUE',
    name: 'UEFA Conference League',
    externalId: CONFERENCE_LEAGUE_NOT_COVERED_BY_PROVIDER,
  },
];

/**
 * Catalogo inicial de insignias. Extensible: anadir una entrada aqui y su
 * checker correspondiente en BadgesService.CHECKERS.
 */
const BADGES: Array<{ code: string; name: string; description: string }> = [
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
];

async function main() {
  const currentSeason = getCurrentFootballSeason();

  for (const competition of COMPETITIONS) {
    await prisma.competition.upsert({
      where: { code: competition.code },
      update: {
        name: competition.name,
        externalId: competition.externalId,
        currentSeason,
      },
      create: { ...competition, currentSeason },
    });
  }

  for (const badge of BADGES) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      update: { name: badge.name, description: badge.description },
      create: badge,
    });
  }

  console.log(`Seed OK: ${COMPETITIONS.length} competiciones (temporada ${currentSeason}), ${BADGES.length} insignias.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
