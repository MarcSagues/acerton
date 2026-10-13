import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, map } from 'rxjs';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { GroupsService } from '../../../core/services/groups.service';
import { RankingsService } from '../../../core/services/rankings.service';
import { MatchdaysService } from '../../../core/services/matchdays.service';
import { AuthService } from '../../../core/services/auth.service';
import { TutorialService } from '../../../core/services/tutorial.service';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { SeasonsService } from '../../../core/services/seasons.service';
import { Group } from '../../../core/models/group.model';
import { ExactScoreLeader, MatchdayHistoryEntry, RankingPeriod, RankingRow } from '../../../core/models/ranking.model';
import { t } from '../../../core/i18n/translate';
import { competitionShortName, mergeCompetitionHistories } from './competition-history';

export interface EvolutionBar {
  label: string;
  /** Solo en "General": la liga de esa jornada, debajo del numero. */
  sublabel?: string;
  points: number;
  /** 0-100, para la altura de la barra. */
  heightPct: number;
  /** La jornada que se esta viendo (en Semanal, la elegida; en Total, la ultima): va resaltada. */
  active: boolean;
}

/** Grafica de "Evolucion": la de lineas de todo el grupo (por defecto) o la de barras con solo tus puntos. */
export type EvolutionMode = 'group' | 'me';

export interface EvolutionSeries {
  userId: string;
  name: string;
  isMe: boolean;
  /** Color de la linea (0 = tu, 1-5 = rivales en orden): el mismo en Semanal y en Total. */
  slot: number;
  values: number[];
}

export interface EvolutionChart {
  labels: string[];
  /** Solo en "General": la liga de cada jornada, en corto, bajo el numero en el eje. */
  sublabels?: string[];
  /** Solo en "General": el nombre completo de la liga de cada jornada, para la lectura al tocar un punto. */
  fullLabels?: string[];
  series: EvolutionSeries[];
  /** Total: puntos acumulados tras cada jornada. Semanal: los puntos de cada jornada. */
  cumulative: boolean;
  /** Indice de la jornada que se esta viendo en Semanal (se resalta), o null. */
  highlightIndex: number | null;
}

/** Jornadas que pinta la grafica de lineas (las mas recientes). */
const GROUP_CHART_MATCHDAYS = 8;
/** Rivales que salen en la grafica de lineas, ademas de ti: los que van primero en el acumulado. Con mas lineas no se distinguen. */
const GROUP_CHART_RIVALS = 5;
/** Filas del "Rey del marcador exacto" ademas del rey (o reyes, si hay empate). */
const EXACT_RUNNERS_UP = 4;

@Injectable()
export class RankingsPageFacade {
  private readonly groupsService = inject(GroupsService);
  private readonly rankingsService = inject(RankingsService);
  private readonly matchdaysService = inject(MatchdaysService);
  private readonly authService = inject(AuthService);
  private readonly tutorialService = inject(TutorialService);
  private readonly seasonsService = inject(SeasonsService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly activeGroupService = inject(ActiveGroupService);

  /** Se inicia al entrar por primera vez en un grupo (Tabla es donde se aterriza al elegirlo). */
  private tutorialHandledThisSession = false;
  /** Grupo y competicion de los que ya se pidieron las jornadas finalizadas (cambiar de periodo no las vuelve a pedir). */
  private finishedMatchdaysKey = '';
  /** Numero de la ultima peticion de clasificacion: una respuesta tardia de una anterior se descarta. */
  private rankingRequestId = 0;

  readonly loading = signal(true);
  readonly loadingRanking = signal(false);
  readonly resolvingUserId = signal<string | null>(null);
  readonly groupDetail = signal<Group | null>(null);
  readonly period = signal<RankingPeriod>('TOTAL');
  readonly scope = signal<string>('general');
  readonly rows = signal<RankingRow[]>([]);
  /** Jornadas ya finalizadas de la competicion elegida, de la mas nueva a la mas antigua: alimentan la grafica de evolucion y el selector de jornada. */
  readonly finishedMatchdays = signal<MatchdayHistoryEntry[]>([]);
  /** Jornada concreta que se esta viendo, o null para la ultima (la clasificacion de siempre, con la subida/bajada de posiciones). */
  readonly selectedMatchdayId = signal<string | null>(null);
  readonly currentUserId = this.authService.currentUser()?.id;
  /** Etiqueta de la temporada abierta del grupo ("2026/27"), o null si todavia no se ha puntuado ninguna jornada. */
  readonly currentSeasonLabel = signal<string | null>(null);
  /** La grafica de evolucion que se ve: la del grupo por defecto, la tuya si la eliges. */
  readonly evolutionMode = signal<EvolutionMode>('group');
  /**
   * El usuario estaba en "General" y paso a Semanal (que no tiene vista general y salta a la primera liga): al volver a
   * Total se le devuelve a "General", para que Total ensene siempre lo que eligio y no lo que dejo la semanal.
   */
  private returnToGeneralOnTotal = false;
  /** Marcadores exactos de cada jugador en la vista actual; null si no aplica (grupo de 1X2) o no se pudo cargar. */
  readonly exactLeaders = signal<ExactScoreLeader[] | null>(null);

  readonly activeCompetitions = computed(
    () => (this.groupDetail()?.groupCompetitions ?? []).filter((gc) => gc.isActive).map((gc) => gc.competition),
  );
  readonly hasMultipleCompetitions = computed(() => this.activeCompetitions().length > 1);
  readonly myRow = computed(() => this.rows().find((r) => r.userId === this.currentUserId) ?? null);
  /**
   * En Semanal y en Total, pero solo por competicion: cada una tiene su
   * propio calendario de jornadas, no hay "jornada combinada" en la vista general.
   */
  readonly showEvolution = computed(() => this.period() === 'TOTAL' || this.scope() !== 'general');
  /**
   * Selector de jornada: solo en la clasificacion semanal (en "Total" no hay
   * historial de jornadas: es siempre el acumulado de ahora), por competicion
   * (en la vista general no hay jornadas) y si ya hay alguna finalizada.
   */
  readonly showMatchdayPicker = computed(
    () => this.period() === 'WEEKLY' && this.scope() !== 'general' && this.finishedMatchdays().length > 0,
  );
  /** Las jornadas del selector en orden cronologico (J1, J2, J3...). */
  readonly matchdayChips = computed(() => [...this.finishedMatchdays()].sort((a, b) => a.order - b.order));
  /** true si se esta viendo una jornada anterior a la ultima. */
  readonly viewingPastMatchday = computed(() => this.selectedMatchdayId() !== null);
  readonly selectedMatchdayOrder = computed(
    () => this.finishedMatchdays().find((md) => md.matchdayId === this.selectedMatchdayId())?.order ?? null,
  );
  /** La jornada que se esta viendo en Semanal (la elegida o, si no, la ultima); null en Total. */
  private readonly viewedMatchdayId = computed(() =>
    this.period() === 'WEEKLY' ? (this.selectedMatchdayId() ?? this.finishedMatchdays()[0]?.matchdayId ?? null) : null,
  );
  readonly evolutionBars = computed<EvolutionBar[]>(() => {
    const recent = this.finishedMatchdays().slice(0, 6).reverse();
    const max = Math.max(1, ...recent.map((m) => m.myPoints ?? 0));
    const viewed = this.viewedMatchdayId();
    return recent.map((m, index) => ({
      label: t('common.jornadaAbrev', { order: m.order }),
      sublabel: m.competition ? competitionShortName(m.competition.code, m.competition.name) : undefined,
      points: m.myPoints ?? 0,
      heightPct: m.myPoints === null ? 0 : Math.max(6, Math.round((m.myPoints / max) * 100)),
      active: viewed ? m.matchdayId === viewed : index === recent.length - 1,
    }));
  });
  /**
   * Grafica de lineas del grupo: tu y los cinco que van primero en el
   * acumulado de la competicion (los mismos, con el mismo color, en Semanal y
   * en Total), en las ultimas jornadas finalizadas. Solo cuentan los miembros
   * actuales del grupo y las jornadas que el grupo jugo (quien no tiene puntos
   * en una, 0, como en la tabla de esa jornada). null si el backend no manda los
   * puntos de todos (version anterior): entonces solo hay grafica individual.
   */
  readonly groupChart = computed<EvolutionChart | null>(() => {
    // En "General" las jornadas son de varias ligas: van por fecha (J1 Liga, J1 Champions, J2 Liga...) y no por numero.
    const played = [...this.finishedMatchdays()]
      .sort((a, b) => (a.competition ? Date.parse(a.closesAt ?? '') - Date.parse(b.closesAt ?? '') : a.order - b.order))
      .filter((m) => (m.scores?.length ?? 0) > 0);
    if (played.length === 0) return null;

    const memberNames = new Map(this.rows().map((r) => [r.userId, r.user.name]));
    const isMember = (userId: string) => memberNames.size === 0 || memberNames.has(userId);

    const totals = new Map<string, number>();
    const names = new Map<string, string>();
    const totalsAfter: Map<string, number>[] = [];
    for (const md of played) {
      for (const score of md.scores ?? []) {
        if (!isMember(score.userId)) continue;
        totals.set(score.userId, (totals.get(score.userId) ?? 0) + score.points);
        names.set(score.userId, memberNames.get(score.userId) ?? score.name);
      }
      totalsAfter.push(new Map(totals));
    }

    const me = this.currentUserId;
    const rivals = [...totals.entries()]
      .filter(([userId]) => userId !== me)
      .sort((a, b) => b[1] - a[1] || (names.get(a[0]) ?? '').localeCompare(names.get(b[0]) ?? ''))
      .slice(0, GROUP_CHART_RIVALS)
      .map(([userId]) => userId);
    const iAmIn = !!me && (totals.has(me) || memberNames.has(me));
    const players = iAmIn ? [me!, ...rivals] : rivals;

    const first = Math.max(0, played.length - GROUP_CHART_MATCHDAYS);
    const shown = played.slice(first);
    const cumulative = this.period() === 'TOTAL';
    const viewed = this.viewedMatchdayId();
    const highlight = viewed ? shown.findIndex((m) => m.matchdayId === viewed) : -1;
    const general = shown.every((m) => !!m.competition);
    return {
      labels: shown.map((m) => t('common.jornadaAbrev', { order: m.order })),
      sublabels: general ? shown.map((m) => competitionShortName(m.competition!.code, m.competition!.name)) : undefined,
      fullLabels: general ? shown.map((m) => m.competition!.name) : undefined,
      cumulative,
      highlightIndex: highlight >= 0 ? highlight : null,
      series: players.map((userId, index) => ({
        userId,
        name: userId === me ? t('rankingsPage.tuCorto') : (names.get(userId) ?? ''),
        isMe: userId === me,
        slot: iAmIn ? index : index + 1,
        values: shown.map((md, i) =>
          cumulative
            ? (totalsAfter[first + i].get(userId) ?? 0)
            : (md.scores?.find((score) => score.userId === userId)?.points ?? 0),
        ),
      })),
    };
  });
  /** La grafica de lineas solo si hay datos de todo el grupo; si no, la individual y sin selector. */
  readonly effectiveEvolutionMode = computed<EvolutionMode>(() => (this.groupChart() ? this.evolutionMode() : 'me'));
  readonly hasEvolution = computed(
    () => this.showEvolution() && (this.groupChart() !== null || this.evolutionBars().length > 0),
  );
  /** Primera y ultima jornada de la grafica que se esta viendo, para el "J3 → J7" de la cabecera. */
  readonly evolutionRange = computed<{ from: string; to: string } | null>(() => {
    const withLeague = (label: string, league?: string) => (league ? `${label} ${league}` : label);
    const chart = this.groupChart();
    const labels =
      this.effectiveEvolutionMode() === 'group'
        ? (chart?.labels ?? []).map((label, i) => withLeague(label, chart?.sublabels?.[i]))
        : this.evolutionBars().map((b) => withLeague(b.label, b.sublabel));
    return labels.length ? { from: labels[0], to: labels[labels.length - 1] } : null;
  });

  readonly isExactScoreGroup = computed(() => this.groupDetail()?.scoringMode === 'EXACT_SCORE');
  /** Quien va primero en marcadores exactos (varios si empatan). Vacio si nadie ha clavado ninguno todavia. */
  readonly exactKings = computed(() => (this.exactLeaders() ?? []).filter((l) => l.position === 1 && l.exactHits > 0));
  /** Los siguientes con algun exacto, hasta cuatro. */
  readonly exactRunnersUp = computed(() =>
    (this.exactLeaders() ?? []).filter((l) => l.position > 1 && l.exactHits > 0).slice(0, EXACT_RUNNERS_UP),
  );
  /** Tu fila, si no sales ya entre los de arriba (tambien con 0 exactos). */
  readonly myExactRow = computed(() => {
    const shown = [...this.exactKings(), ...this.exactRunnersUp()];
    if (shown.some((l) => l.userId === this.currentUserId)) return null;
    return (this.exactLeaders() ?? []).find((l) => l.userId === this.currentUserId) ?? null;
  });
  /** Nombres del rey (o reyes) del exacto: "Ana", "Ana y Bea" o "Ana, Bea y 2 más". */
  readonly exactKingNames = computed(() => {
    const names = this.exactKings().map((l) => (l.userId === this.currentUserId ? t('rankingsPage.tuCorto') : l.user.name));
    if (names.length <= 2) return names.join(t('rankingsPage.yNombres'));
    return t('rankingsPage.nombresYMas', { names: names.slice(0, 2).join(', '), count: names.length - 2 });
  });

  constructor() {
    effect(
      () => {
        const groupId = this.activeGroupService.activeId();
        // untracked: loadGroup lee otras señales (grupo activo, periodo,
        // scope...) y no deben volver a lanzar la carga cuando cambian — solo
        // un cambio de grupo activo.
        if (groupId) {
          untracked(() => this.loadGroup(groupId));
        }
      },
      { allowSignalWrites: true },
    );
  }

  private loadGroup(groupId: string): void {
    // /groups/mine ya trae este grupo con todo lo que esta pantalla necesita
    // (competiciones activas, modo de puntuacion) y hasGroupGuard lo deja en
    // memoria antes de entrar: se pinta y se pide la clasificacion YA, sin
    // esperar un viaje extra a /groups/:id (antes: grupo -> clasificacion en
    // serie, el contenido tardaba dos viajes completos en aparecer).
    const cached = this.activeGroupService.activeGroup();
    if (cached && cached.id === groupId) {
      this.applyGroup(cached);
      return;
    }
    this.loading.set(true);
    this.groupsService.getById(groupId).subscribe((group) => this.applyGroup(group));
  }

  private applyGroup(group: Group): void {
    const groupId = group.id;
    this.groupDetail.set(group);
    const active = (group.groupCompetitions ?? []).filter((gc) => gc.isActive);
    // Se entra en la primera liga, no en "General": solo por liga hay grafica de evolucion y selector de jornada, y asi
    // Total ensena lo mismo al entrar que despues de pasar por Semanal. "General" sigue a un toque en las pestañas.
    this.scope.set(active[0]?.competitionId ?? 'general');
    this.returnToGeneralOnTotal = false;
    this.selectedMatchdayId.set(null);
    this.finishedMatchdaysKey = '';
    this.finishedMatchdays.set([]);
    this.exactLeaders.set(null);
    this.loading.set(false);
    this.fetchRanking(groupId);
    this.seasonsService.listSeasons(groupId).subscribe({
      next: (seasons) => this.currentSeasonLabel.set(seasons.find((s) => !s.endedAt)?.label ?? null),
      error: () => this.currentSeasonLabel.set(null),
    });

    if (!this.tutorialHandledThisSession && !this.tutorialService.hasSeenTutorial()) {
      this.tutorialHandledThisSession = true;
      this.tutorialService.start(group.scoringMode);
    }
  }

  setPeriod(period: RankingPeriod): void {
    this.period.set(period);
    // "Total" es siempre el acumulado de ahora: no se queda ninguna jornada anterior elegida.
    if (period === 'TOTAL') this.selectedMatchdayId.set(null);
    // La clasificacion semanal general no existe (cada competicion tiene su
    // propio calendario de jornadas): al elegir "Semanal" estando en
    // "General" se cambia a la primera competicion activa en vez de dejar
    // una combinacion sin sentido seleccionada.
    if (period === 'WEEKLY' && this.scope() === 'general') {
      this.returnToGeneralOnTotal = true;
      this.scope.set(this.activeCompetitions()[0]?.id ?? 'general');
    } else if (period === 'TOTAL' && this.returnToGeneralOnTotal) {
      this.returnToGeneralOnTotal = false;
      this.scope.set('general');
    }
    const groupId = this.activeGroupService.activeId();
    if (groupId) this.fetchRanking(groupId);
  }

  setEvolutionMode(mode: EvolutionMode): void {
    this.evolutionMode.set(mode);
  }

  setScope(scope: string): void {
    this.returnToGeneralOnTotal = false;
    this.scope.set(scope);
    // Cada competicion tiene su propio calendario de jornadas.
    this.selectedMatchdayId.set(null);
    const groupId = this.activeGroupService.activeId();
    if (groupId) this.fetchRanking(groupId);
  }

  /**
   * Ver lo que se puntuo en una jornada anterior (solo en la clasificacion
   * semanal). Elegir la ultima vuelve a la vista de siempre, que ademas muestra
   * cuantos puestos se ha subido o bajado.
   */
  selectMatchday(matchdayId: string): void {
    if (this.period() !== 'WEEKLY') return;
    const latestId = this.finishedMatchdays()[0]?.matchdayId ?? null;
    this.selectedMatchdayId.set(matchdayId === latestId ? null : matchdayId);
    const groupId = this.activeGroupService.activeId();
    if (groupId) this.fetchRanking(groupId);
  }

  isMatchdaySelected(matchdayId: string): boolean {
    const selected = this.selectedMatchdayId();
    return selected === null ? matchdayId === this.finishedMatchdays()[0]?.matchdayId : selected === matchdayId;
  }

  /** "+2"/"-1" para el indicador de posicion ganada/perdida respecto a la jornada anterior; null si no ha cambiado (no se muestra nada). */
  deltaLabel(delta: number): string | null {
    if (delta > 0) return `+${delta}`;
    if (delta < 0) return `${delta}`;
    return null;
  }

  /** Pulsar a un jugador abre su perfil general (grupos, Quiz, insignias, trofeos...). */
  openProfile(userId: string): void {
    void this.router.navigate(['/player', userId]);
  }

  /**
   * Abre las quinielas de un jugador para la jornada cerrada mas reciente de
   * la competicion seleccionada (o de la primera activa si la vista es
   * "general"). Si la jornada "en vivo" de esa competicion todavia esta
   * abierta, retrocede a la anterior — nunca se navega a una jornada sin
   * cerrar (el backend lo rechazaria igualmente, ver getGroupPredictionsForMatchday).
   */
  viewUserPicks(userId: string): void {
    const groupId = this.activeGroupService.activeId();
    if (!groupId || this.resolvingUserId()) return;

    // Viendo una jornada anterior: las quinielas son las de ESA jornada (ya finalizada, asi que esta cerrada).
    const viewedMatchdayId = this.selectedMatchdayId();
    if (viewedMatchdayId) {
      this.router.navigate(
        userId === this.currentUserId ? ['/matchday', viewedMatchdayId, 'results'] : ['/matchday', viewedMatchdayId, 'results', userId],
      );
      return;
    }

    const scope = this.scope();
    const competitionId = scope !== 'general' ? scope : this.activeCompetitions()[0]?.id;
    if (!competitionId) return;

    this.resolvingUserId.set(userId);
    this.matchdaysService.getLatestLockedMatchday(groupId, competitionId).subscribe({
      next: (matchday) => {
        this.resolvingUserId.set(null);
        if (!matchday) {
          this.toast.show(t('rankingsPage.todaviaHayJornadasCerradas'));
          return;
        }
        const path =
          userId === this.currentUserId
            ? ['/matchday', matchday.id, 'results']
            : ['/matchday', matchday.id, 'results', userId];
        this.router.navigate(path);
      },
      error: () => {
        this.resolvingUserId.set(null);
        this.toast.show(t('currentMatchday.pudoCargarJornada'));
      },
    });
  }

  private fetchRanking(groupId: string): void {
    const request = ++this.rankingRequestId;
    const scope = this.scope();
    const matchdayId = this.selectedMatchdayId();
    this.loadingRanking.set(true);
    const source =
      matchdayId && scope !== 'general'
        ? this.rankingsService.getRankingForMatchday(groupId, this.period(), scope, matchdayId)
        : this.rankingsService.getRanking(groupId, this.period(), scope);
    source.subscribe({
      next: (rows) => {
        if (request !== this.rankingRequestId) return;
        this.rows.set(rows);
        this.loadingRanking.set(false);
      },
      error: () => {
        if (request !== this.rankingRequestId) return;
        this.rows.set([]);
        this.loadingRanking.set(false);
      },
    });

    this.loadExactLeaders(groupId, request, scope, matchdayId);
    this.loadFinishedMatchdays(groupId, scope);
  }

  /**
   * "Rey del marcador exacto", solo en grupos de resultado exacto y con el
   * mismo alcance que la tabla (la jornada vista en Semanal, el acumulado en
   * Total). Si falla (o el backend aun no lo tiene) la tarjeta no sale.
   */
  private loadExactLeaders(groupId: string, request: number, scope: string, matchdayId: string | null): void {
    if (!this.isExactScoreGroup() || (this.period() === 'WEEKLY' && scope === 'general')) {
      this.exactLeaders.set(null);
      return;
    }
    this.rankingsService.getExactScoreLeaders(groupId, this.period(), scope, scope !== 'general' ? matchdayId : null).subscribe({
      next: (leaders) => {
        if (request === this.rankingRequestId) this.exactLeaders.set(leaders);
      },
      error: () => {
        if (request === this.rankingRequestId) this.exactLeaders.set(null);
      },
    });
  }

  /**
   * "General": las jornadas finalizadas de todas las ligas activas del grupo juntas, por fecha, para la grafica de
   * evolucion (no hay selector de jornada: cada liga tiene su calendario). Una peticion por liga, una vez por grupo.
   */
  private loadGeneralMatchdays(groupId: string): void {
    const competitions = this.activeCompetitions();
    if (competitions.length === 0) {
      this.finishedMatchdaysKey = '';
      this.finishedMatchdays.set([]);
      return;
    }
    const key = `${groupId}:general`;
    if (key === this.finishedMatchdaysKey) return;
    this.finishedMatchdaysKey = key;
    this.finishedMatchdays.set([]);
    forkJoin(
      competitions.map((competition) =>
        this.rankingsService.getHistory(groupId, competition.id).pipe(
          map((history) => ({
            competition: { id: competition.id, name: competition.name, code: competition.code as string },
            matchdays: history.matchdays,
          })),
        ),
      ),
    ).subscribe({
      next: (parts) => {
        if (key === this.finishedMatchdaysKey) this.finishedMatchdays.set(mergeCompetitionHistories(parts));
      },
      error: () => {
        // Se vuelve a intentar la proxima vez que se pida la clasificacion.
        if (key === this.finishedMatchdaysKey) this.finishedMatchdaysKey = '';
      },
    });
  }

  /** Una vez por grupo y competicion: la grafica de evolucion y el selector de jornada salen de la misma peticion. */
  private loadFinishedMatchdays(groupId: string, scope: string): void {
    if (scope === 'general') {
      this.loadGeneralMatchdays(groupId);
      return;
    }
    const key = `${groupId}:${scope}`;
    if (key === this.finishedMatchdaysKey) return;
    this.finishedMatchdaysKey = key;
    this.finishedMatchdays.set([]);
    this.rankingsService.getHistory(groupId, scope).subscribe({
      next: (history) => {
        if (key === this.finishedMatchdaysKey) this.finishedMatchdays.set(history.matchdays);
      },
      error: () => {
        // Se vuelve a intentar la proxima vez que se pida la clasificacion.
        if (key === this.finishedMatchdaysKey) this.finishedMatchdaysKey = '';
      },
    });
  }
}
