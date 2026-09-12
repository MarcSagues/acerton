import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  text: string;
  actionLabel?: string;
  action?: () => void;
}

/** Reemplaza MatSnackBar: cola de avisos breves, sin el theming de Material. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  readonly messages = signal<ToastMessage[]>([]);

  show(text: string, opts?: { actionLabel?: string; action?: () => void; duration?: number }): void {
    const id = ++this.nextId;
    this.messages.update((current) => [
      ...current,
      { id, text, actionLabel: opts?.actionLabel, action: opts?.action },
    ]);
    setTimeout(() => this.dismiss(id), opts?.duration ?? 3000);
  }

  dismiss(id: number): void {
    this.messages.update((current) => current.filter((m) => m.id !== id));
  }
}
