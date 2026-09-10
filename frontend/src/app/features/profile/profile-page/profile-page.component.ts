import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { ProfileService } from '../../../core/services/profile.service';
import { BadgesService } from '../../../core/services/badges.service';
import { AuthService } from '../../../core/services/auth.service';
import { PushNotificationsService } from '../../../core/services/push-notifications.service';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { TutorialService } from '../../../core/services/tutorial.service';
import { UserProfile } from '../../../core/models/profile.model';
import { Badge } from '../../../core/models/profile.model';
import { usernameHint, validateUsername } from '../../../shared/username.util';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatProgressSpinnerModule],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly badgesService = inject(BadgesService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  readonly authService = inject(AuthService);
  readonly pushNotifications = inject(PushNotificationsService);
  private readonly activeGroupService = inject(ActiveGroupService);
  private readonly tutorialService = inject(TutorialService);

  readonly loading = signal(true);
  readonly profile = signal<UserProfile | null>(null);
  readonly catalog = signal<Badge[]>([]);

  readonly bestCurrentStreak = computed(() =>
    Math.max(0, ...(this.profile()?.groups.map((g) => g.streak.currentStreak) ?? [0])),
  );
  readonly bestLongestStreak = computed(() =>
    Math.max(0, ...(this.profile()?.groups.map((g) => g.streak.longestStreak) ?? [0])),
  );
  readonly badgeStates = computed(() => {
    const earnedCodes = new Set((this.profile()?.badges ?? []).map((b) => b.badge.code));
    return this.catalog().map((badge) => ({ badge, earned: earnedCodes.has(badge.code) }));
  });

  readonly nameInput = signal('');
  readonly nameSaving = signal(false);
  readonly nameError = signal<string | null>(null);

  readonly nameChangeAvailableAt = computed(() => {
    const iso = this.authService.currentUser()?.nameChangeAvailableAt;
    return iso ? new Date(iso) : null;
  });

  /** Feedback en vivo mientras se escribe. */
  nameHint(): string | null {
    const value = this.nameInput();
    if (!value) return null;
    return usernameHint(validateUsername(value));
  }

  canSaveName(): boolean {
    const name = this.nameInput().trim();
    const current = this.authService.currentUser();
    return (
      !this.nameSaving() &&
      !!name &&
      !!current &&
      name !== current.name &&
      validateUsername(this.nameInput()) === null
    );
  }

  enablePushNotifications(): void {
    this.pushNotifications.enable();
  }

  /** Repetir el tutorial no reinicia el flag del backend, solo lo vuelve a mostrar desde Tabla. */
  replayTutorial(): void {
    const scoringMode = this.activeGroupService.activeGroup()?.scoringMode ?? 'ONE_X_TWO';
    this.tutorialService.start(scoringMode);
    this.router.navigate(['/rankings']);
  }

  saveName(): void {
    if (!this.canSaveName()) {
      return;
    }
    const name = this.nameInput().trim();

    this.nameSaving.set(true);
    this.nameError.set(null);
    this.profileService.updateName(name).subscribe({
      next: (user) => {
        this.nameSaving.set(false);
        this.authService.setCurrentUser(user);
        this.nameInput.set(user.name);
      },
      error: (error: HttpErrorResponse) => {
        this.nameSaving.set(false);
        this.nameError.set(error.error?.message ?? 'No se pudo cambiar el nombre');
      },
    });
  }

  logout(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Cerrar sesion',
        message: 'Vas a cerrar sesion en este dispositivo. ¿Confirmas?',
        confirmLabel: 'Cerrar sesion',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.authService.logout().subscribe(() => this.router.navigate(['/login']));
    });
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  ngOnInit(): void {
    this.nameInput.set(this.authService.currentUser()?.name ?? '');
    this.profileService.getMyProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.badgesService.getCatalog().subscribe((catalog) => this.catalog.set(catalog));
  }
}
