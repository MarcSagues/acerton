import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationPreferencesService } from '../../../core/services/notification-preferences.service';
import { GroupsService } from '../../../core/services/groups.service';
import { PushNotificationsService } from '../../../core/services/push-notifications.service';
import { NotificationPreferenceKey, NotificationPreferences } from '../../../core/models/notification-preferences.model';

@Injectable()
export class NotificationSettingsFacade {
  private readonly router = inject(Router);
  private readonly preferencesService = inject(NotificationPreferencesService);
  private readonly groupsService = inject(GroupsService);
  readonly pushNotifications = inject(PushNotificationsService);

  readonly loading = signal(true);
  readonly preferences = signal<NotificationPreferences | null>(null);
  /** Claves con una peticion de guardado en curso, para deshabilitar solo ese toggle mientras tanto. */
  readonly savingKeys = signal<Set<string>>(new Set());

  readonly groups = computed(() => this.preferences()?.groups ?? []);

  init(): void {
    this.preferencesService.get().subscribe({
      next: (preferences) => {
        this.preferences.set(preferences);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goBack(): void {
    this.router.navigate(['/profile']);
  }

  isSaving(key: string): boolean {
    return this.savingKeys().has(key);
  }

  private setSaving(key: string, saving: boolean): void {
    this.savingKeys.update((current) => {
      const next = new Set(current);
      if (saving) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }

  togglePreference(key: NotificationPreferenceKey): void {
    const current = this.preferences();
    if (!current || this.isSaving(key)) return;

    const nextValue = !current[key];
    this.preferences.set({ ...current, [key]: nextValue });
    this.setSaving(key, true);
    this.preferencesService.update({ [key]: nextValue }).subscribe({
      next: (updated) => {
        this.preferences.set(updated);
        this.setSaving(key, false);
      },
      error: () => {
        // Revertir: la peticion ha fallado, el toggle vuelve a su valor anterior.
        this.preferences.set(current);
        this.setSaving(key, false);
      },
    });
  }

  toggleGroupMuted(groupId: string): void {
    const current = this.preferences();
    if (!current || this.isSaving(groupId)) return;

    const group = current.groups.find((g) => g.groupId === groupId);
    if (!group) return;
    const nextMuted = !group.muted;

    this.preferences.set({
      ...current,
      groups: current.groups.map((g) => (g.groupId === groupId ? { ...g, muted: nextMuted } : g)),
    });
    this.setSaving(groupId, true);
    this.groupsService.setMuted(groupId, nextMuted).subscribe({
      next: () => this.setSaving(groupId, false),
      error: () => {
        this.preferences.set(current);
        this.setSaving(groupId, false);
      },
    });
  }
}
