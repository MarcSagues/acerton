import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BottomSheetService } from '../../../shared/ui/bottom-sheet/bottom-sheet.service';
import { ProfileService } from '../../../core/services/profile.service';
import { XpProgress } from '../../../core/models/profile.model';
import { LevelInfoSheetComponent } from './level-info-sheet.component';
import { LEVEL_REWARDS, TIER_NAMES, rankForLevel, tierIndexOfLevel, tierRangeLabel, xpForLevel } from './level-progress.domain';

export interface LevelNodeView {
  n: number;
  reward: string;
  kind: 'color' | 'mascot';
  swatch?: string;
  locked: boolean;
  current: boolean;
  milestone: boolean;
  selected: boolean;
  /** 0-1: cuanto del tramo de barra hasta el siguiente nivel esta relleno. */
  fill: number;
}

export interface TierChipView {
  label: string;
  active: boolean;
  done: boolean;
  firstLevel: number;
}

export interface StatCardView {
  value: string;
  label: string;
  tone: 'text' | 'warning';
}

/**
 * De momento fijos aqui: no hay todavia agregados reales de "aciertos de
 * esta jornada"/"racha actual en este formato"/"puesto en el ranking
 * global" pensados para esta tarjeta (serian consultas nuevas, distintas
 * de lo que ya expone /users/me/profile) — ver aviso "Vista de
 * demostracion" en la plantilla, que cubre estas 3 tarjetas.
 */
const DEMO_STATS: StatCardView[] = [
  { value: '8/12', label: 'Aciertos', tone: 'text' },
  { value: 'x3', label: 'Racha', tone: 'warning' },
  { value: '#142', label: 'Ranking', tone: 'text' },
];

@Injectable()
export class LevelProgressFacade {
  private readonly router = inject(Router);
  private readonly sheet = inject(BottomSheetService);
  private readonly profileService = inject(ProfileService);

  readonly loading = signal(true);
  readonly demoCalloutDismissed = signal(false);
  readonly claimed = signal(false);
  private readonly xp = signal<XpProgress>({ level: 1, currentLevelXp: 0, neededForLevel: xpForLevel(1) });
  private readonly selectedLevel = signal(1);

  readonly maxLevel = LEVEL_REWARDS.length;
  readonly stats = DEMO_STATS;

  readonly currentLevel = computed(() => this.xp().level);
  readonly needXp = computed(() => this.xp().neededForLevel);
  readonly currentXp = computed(() => this.xp().currentLevelXp);
  readonly levelFraction = computed(() => Math.max(0, Math.min(1, this.currentXp() / this.needXp())));
  readonly rank = computed(() => rankForLevel(this.currentLevel()));
  readonly tierLabel = computed(
    () => `${TIER_NAMES[tierIndexOfLevel(this.currentLevel())].toUpperCase()} · NIVEL ${this.currentLevel()} DE ${this.maxLevel}`,
  );
  readonly toNextLabel = computed(
    () => `Te faltan ${Math.max(0, this.needXp() - this.currentXp())} XP para desbloquear el nivel ${this.currentLevel() + 1}.`,
  );
  readonly unlockedLabel = computed(() => `${this.currentLevel()} de ${this.maxLevel} desbloqueados`);

  readonly selected = computed(() => this.selectedLevel());

  readonly levels = computed<LevelNodeView[]>(() => {
    const current = this.currentLevel();
    const fraction = this.levelFraction();
    const selected = this.selectedLevel();
    return LEVEL_REWARDS.map((item) => {
      const isCurrent = item.n === current;
      const unlocked = item.n <= current;
      const fill = item.n < current ? 1 : isCurrent ? fraction : 0;
      return {
        n: item.n,
        reward: item.reward,
        kind: item.kind,
        swatch: item.swatch,
        locked: !unlocked,
        current: isCurrent,
        milestone: item.n % 6 === 0,
        selected: selected === item.n,
        fill,
      };
    });
  });

  readonly tiers = computed<TierChipView[]>(() => {
    const current = this.currentLevel();
    const selectedTier = tierIndexOfLevel(this.selectedLevel());
    return TIER_NAMES.map((_, i) => ({
      label: tierRangeLabel(i),
      active: selectedTier === i,
      done: current > (i + 1) * 6,
      firstLevel: i * 6 + 1,
    }));
  });

  readonly selectedReward = computed(() => LEVEL_REWARDS[this.selected() - 1]);
  readonly selectedUnlocked = computed(() => this.selected() <= this.currentLevel());
  readonly selectedIsCurrent = computed(() => this.selected() === this.currentLevel());
  readonly selectedFraction = computed(() => {
    const sel = this.selected();
    const current = this.currentLevel();
    if (sel < current) return 1;
    if (sel === current) return this.levelFraction();
    return 0;
  });
  readonly selectedNeed = computed(() => xpForLevel(this.selected()));
  readonly selectedStatusLabel = computed(() =>
    this.selected() < this.currentLevel() ? 'CONSEGUIDO' : this.selectedIsCurrent() ? 'EN CURSO' : 'BLOQUEADO',
  );
  readonly selectedDescription = computed(() => {
    const sel = this.selected();
    const current = this.currentLevel();
    if (sel < current) return `Desbloqueado en el nivel ${sel}. Puedes activarlo desde tu perfil.`;
    if (this.selectedIsCurrent()) {
      return `Te faltan ${Math.max(0, this.needXp() - this.currentXp())} XP de los ${this.needXp()} de este nivel.`;
    }
    return `Se desbloquea al completar los ${this.selectedNeed()} XP del nivel ${sel}.`;
  });
  readonly ctaLabel = computed(() => {
    if (this.selectedIsCurrent()) {
      return this.claimed() ? 'Te avisaremos al desbloquearlo' : 'Avisarme al desbloquear';
    }
    if (this.selected() < this.currentLevel()) return 'Ver en mi perfil';
    return `Faltan ${this.selected() - this.currentLevel()} niveles`;
  });

  /** Nivel/XP real (ProfileController) — las recompensas del pase (colores, mascotas...) siguen siendo un catalogo de muestra, ver plantilla. */
  init(): void {
    this.profileService.getMyProfile().subscribe({
      next: (profile) => {
        this.xp.set(profile.xp);
        this.selectedLevel.set(profile.xp.level);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  selectLevel(n: number): void {
    this.selectedLevel.set(n);
  }

  toggleClaim(): void {
    if (this.selectedIsCurrent()) {
      this.claimed.update((v) => !v);
    }
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  openInfo(): void {
    this.sheet.open(LevelInfoSheetComponent);
  }
}
