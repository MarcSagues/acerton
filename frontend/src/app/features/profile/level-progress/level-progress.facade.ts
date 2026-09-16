import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BottomSheetService } from '../../../shared/ui/bottom-sheet/bottom-sheet.service';
import { ProfileService } from '../../../core/services/profile.service';
import { NotificationsFeedService } from '../../../core/services/notifications-feed.service';
import { UserProfile, XpProgress } from '../../../core/models/profile.model';
import { LevelInfoSheetComponent } from './level-info-sheet.component';
import {
  LEVEL_REWARDS,
  TIER_NAMES,
  mascotAssetPath,
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
  mascotUrl?: string;
  locked: boolean;
  current: boolean;
  milestone: boolean;
  selected: boolean;
  /** true si este nivel ya esta desbloqueado pero tiene un aviso de subida de nivel sin leer (ver notice en Avisos). */
  hasUnclaimedReward: boolean;
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

@Injectable()
export class LevelProgressFacade {
  private readonly router = inject(Router);
  private readonly sheet = inject(BottomSheetService);
  private readonly profileService = inject(ProfileService);
  private readonly notificationsFeed = inject(NotificationsFeedService);

  readonly loading = signal(true);
  readonly claimed = signal(false);
  private readonly xp = signal<XpProgress>({ level: 1, currentLevelXp: 0, neededForLevel: xpForLevel(1) });
  private readonly selectedLevel = signal(1);
  private readonly globalStreak = signal({ currentStreak: 0, longestStreak: 0 });
  private readonly accuracy = signal({ hits: 0, scored: 0 });
  private readonly badgesUnlocked = signal({ earned: 0, total: 0 });
  private readonly xpLast7Days = signal(0);

  readonly maxLevel = LEVEL_REWARDS.length;

  readonly xpLast7DaysLabel = computed(() => `${this.xpLast7Days() >= 0 ? '+' : ''}${this.xpLast7Days()}`);

  readonly stats = computed<StatCardView[]>(() => {
    const acc = this.accuracy();
    const badges = this.badgesUnlocked();
    return [
      { value: acc.scored > 0 ? `${acc.hits}/${acc.scored}` : '—', label: 'Aciertos', tone: 'text' },
      { value: `x${this.globalStreak().currentStreak}`, label: 'Racha', tone: 'warning' },
      { value: `${badges.earned}/${badges.total}`, label: 'Insignias', tone: 'text' },
    ];
  });

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

  /** Niveles con un aviso de "subiste de nivel" sin leer (ver NotificationsFeedService.unreadLevelUps). */
  private readonly unclaimedLevels = computed(
    () => new Set(this.notificationsFeed.unreadLevelUps().map((n) => n.level)),
  );

  readonly levels = computed<LevelNodeView[]>(() => {
    const current = this.currentLevel();
    const fraction = this.levelFraction();
    const selected = this.selectedLevel();
    const unclaimed = this.unclaimedLevels();
    return LEVEL_REWARDS.map((item) => {
      const isCurrent = item.n === current;
      const unlocked = item.n <= current;
      const fill = item.n < current ? 1 : isCurrent ? fraction : 0;
      return {
        n: item.n,
        reward: item.reward,
        kind: item.kind,
        swatch: item.swatch,
        mascotUrl: item.mascotId ? mascotAssetPath(item.mascotId) : undefined,
        locked: !unlocked,
        current: isCurrent,
        milestone: item.n % 6 === 0,
        selected: selected === item.n,
        hasUnclaimedReward: unlocked && unclaimed.has(item.n),
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
  readonly selectedHasUnclaimedReward = computed(
    () => this.selectedUnlocked() && this.unclaimedLevels().has(this.selected()),
  );
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

  /** Nivel, XP, recompensas y estadisticas de la tarjeta "Tu jornada" — todo real (ProfileController). */
  init(): void {
    this.profileService.getMyProfile().subscribe({
      next: (profile: UserProfile) => {
        this.xp.set(profile.xp);
        this.selectedLevel.set(profile.xp.level);
        this.globalStreak.set(profile.globalStreak);
        this.accuracy.set(profile.accuracy);
        this.badgesUnlocked.set(profile.badgesUnlocked);
        this.xpLast7Days.set(profile.xpLast7Days);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.notificationsFeed.refresh();
  }

  selectLevel(n: number): void {
    this.selectedLevel.set(n);
  }

  toggleClaim(): void {
    if (this.selectedIsCurrent()) {
      this.claimed.update((v) => !v);
    }
  }

  /** Boton de la tarjeta de detalle: segun el estado del nivel seleccionado, avisa (actual), va a elegir avatar (ya conseguido) o no hace nada (bloqueado). */
  onCtaClick(): void {
    if (this.selectedIsCurrent()) {
      this.toggleClaim();
      return;
    }
    if (this.selected() < this.currentLevel()) {
      this.viewReward(this.selected());
    }
  }

  /** Igual que onCtaClick para un nivel ya conseguido, pero al pulsar directamente el nodo del track. */
  viewReward(level: number): void {
    const notice = this.notificationsFeed.unreadLevelUps().find((n) => n.level === level);
    if (notice) {
      this.notificationsFeed.markRead(notice.id);
    }
    this.router.navigate(['/profile/avatar']);
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  openInfo(): void {
    this.sheet.open(LevelInfoSheetComponent);
  }
}
