import { PrismaClient, CompetitionCode } from '@prisma/client';
import { BADGE_CATALOG } from '../src/badges/badge-catalog';
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

  for (const badge of BADGE_CATALOG) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      update: { name: badge.name, description: badge.description },
      create: badge,
    });
  }

  console.log(
    `Seed OK: ${COMPETITIONS.length} competiciones (temporada ${currentSeason}), ${BADGE_CATALOG.length} insignias.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
