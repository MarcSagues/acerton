import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BottomSheetService } from '../../../shared/ui/bottom-sheet/bottom-sheet.service';
import { LevelInfoSheetComponent } from './level-info-sheet.component';
import {
  LEVEL_REWARDS,
  TIER_NAMES,
  rankForLevel,
  tierIndexOfLevel,
  tierRangeLabel,
  xpForLevel,
} from './level-progress.domain';

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

const DEMO_STATS: StatCardView[] = [
  { value: '8/12', label: 'Aciertos', tone: 'text' },
  { value: 'x3', label: 'Racha', tone: 'warning' },
  { value: '#142', label: 'Ranking', tone: 'text' },
];

/**
 * Datos de muestra fijos mientras no exista el backend de XP/nivel
 * (roadmap Sprint 14). El resto de la pantalla (calculo de fracciones,
 * nodos, chips de tier) es logica real, solo currentLevel/currentXp estan
 * fijados a mano.
 */
const DEMO_CURRENT_LEVEL = 7;
const DEMO_CURRENT_XP = 640;

@Injectable()
export class LevelProgressFacade {
  private readonly router = inject(Router);
  private readonly sheet = inject(BottomSheetService);

  readonly demoCalloutDismissed = signal(false);
  readonly claimed = signal(false);
  private readonly selectedLevel = signal(DEMO_CURRENT_LEVEL);

  readonly currentLevel = DEMO_CURRENT_LEVEL;
  readonly maxLevel = LEVEL_REWARDS.length;
  readonly needXp = xpForLevel(this.currentLevel);
  readonly currentXp = DEMO_CURRENT_XP;
  readonly levelFraction = Math.max(0, Math.min(1, this.currentXp / this.needXp));
  readonly rank = rankForLevel(this.currentLevel);
  readonly tierLabel = `${TIER_NAMES[tierIndexOfLevel(this.currentLevel)].toUpperCase()} · NIVEL ${this.currentLevel} DE ${this.maxLevel}`;
  readonly toNextLabel = `Te faltan ${Math.max(0, this.needXp - this.currentXp)} XP para desbloquear el nivel ${this.currentLevel + 1}.`;
  readonly unlockedLabel = `${this.currentLevel} de ${this.maxLevel} desbloqueados`;
  readonly stats = DEMO_STATS;

  readonly selected = computed(() => this.selectedLevel());

  readonly levels = computed<LevelNodeView[]>(() =>
    LEVEL_REWARDS.map((item) => {
      const isCurrent = item.n === this.currentLevel;
      const unlocked = item.n <= this.currentLevel;
      const fill = item.n < this.currentLevel ? 1 : isCurrent ? this.levelFraction : 0;
      return {
        n: item.n,
        reward: item.reward,
        kind: item.kind,
        swatch: item.swatch,
        locked: !unlocked,
        current: isCurrent,
        milestone: item.n % 6 === 0,
        selected: this.selectedLevel() === item.n,
        fill,
      };
    }),
  );

  readonly tiers = computed<TierChipView[]>(() =>
    TIER_NAMES.map((_, i) => ({
      label: tierRangeLabel(i),
      active: tierIndexOfLevel(this.selectedLevel()) === i,
      done: this.currentLevel > (i + 1) * 6,
      firstLevel: i * 6 + 1,
    })),
  );

  readonly selectedReward = computed(() => LEVEL_REWARDS[this.selected() - 1]);
  readonly selectedUnlocked = computed(() => this.selected() <= this.currentLevel);
  readonly selectedIsCurrent = computed(() => this.selected() === this.currentLevel);
  readonly selectedFraction = computed(() => {
    const sel = this.selected();
    if (sel < this.currentLevel) return 1;
    if (sel === this.currentLevel) return this.levelFraction;
    return 0;
  });
  readonly selectedNeed = computed(() => xpForLevel(this.selected()));
  readonly selectedStatusLabel = computed(() =>
    this.selected() < this.currentLevel ? 'CONSEGUIDO' : this.selectedIsCurrent() ? 'EN CURSO' : 'BLOQUEADO',
  );
  readonly selectedDescription = computed(() => {
    const sel = this.selected();
    if (sel < this.currentLevel) return `Desbloqueado en el nivel ${sel}. Puedes activarlo desde tu perfil.`;
    if (this.selectedIsCurrent()) {
      return `Te faltan ${Math.max(0, this.needXp - this.currentXp)} XP de los ${this.needXp} de este nivel.`;
    }
    return `Se desbloquea al completar los ${this.selectedNeed()} XP del nivel ${sel}.`;
  });
  readonly ctaLabel = computed(() => {
    if (this.selectedIsCurrent()) {
      return this.claimed() ? 'Te avisaremos al desbloquearlo' : 'Avisarme al desbloquear';
    }
    if (this.selected() < this.currentLevel) return 'Ver en mi perfil';
    return `Faltan ${this.selected() - this.currentLevel} niveles`;
  });

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
