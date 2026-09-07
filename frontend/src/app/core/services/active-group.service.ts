import { Injectable, computed, effect, signal } from '@angular/core';
import { Group } from '../models/group.model';

const STORAGE_KEY = 'quiniela.activeGroupId';

/**
 * El grupo activo se elige una vez (selector en la app bar) y persiste
 * entre sesiones. Las pestañas "Jornada" y "Tabla" del bottom nav siempre
 * operan sobre este grupo, en vez de llevar el groupId en cada ruta.
 */
@Injectable({ providedIn: 'root' })
export class ActiveGroupService {
  private readonly groupsSignal = signal<Group[]>([]);
  private readonly activeIdSignal = signal<string | null>(this.readStoredId());

  readonly groups = this.groupsSignal.asReadonly();
  readonly activeId = this.activeIdSignal.asReadonly();
  readonly activeGroup = computed(
    () => this.groupsSignal().find((g) => g.id === this.activeIdSignal()) ?? null,
  );

  constructor() {
    effect(() => {
      const id = this.activeIdSignal();
      if (id) {
        localStorage.setItem(STORAGE_KEY, id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    });
  }

  setGroups(groups: Group[]): void {
    this.groupsSignal.set(groups);
    const currentId = this.activeIdSignal();
    const stillValid = groups.some((g) => g.id === currentId);
    if (!stillValid) {
      this.activeIdSignal.set(groups[0]?.id ?? null);
    }
  }

  setActive(groupId: string): void {
    this.activeIdSignal.set(groupId);
  }

  private readStoredId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }
}
