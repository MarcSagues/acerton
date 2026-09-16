import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Share } from '@capacitor/share';
import { ReferralService } from '../../../core/services/referral.service';
import { environment } from '../../../../environments/environment';

@Injectable()
export class ProfileInviteFacade {
  private readonly router = inject(Router);
  private readonly referralService = inject(ReferralService);

  readonly loading = signal(true);
  private readonly code = signal<string | null>(null);
  readonly referralCount = signal(0);
  /** true durante los 2s posteriores a un copiado con exito (mismo patron que GroupInviteFacade). */
  readonly justCopied = signal(false);

  /** Siempre environment.appUrl, nunca window.location.origin (en la app nativa el origin real es "capacitor://localhost"). */
  readonly link = computed(() => {
    const code = this.code();
    return code ? `${environment.appUrl}/r/${code}` : '';
  });
  readonly codeLabel = computed(() => this.code() ?? '');

  readonly redeemInput = signal('');
  readonly redeeming = signal(false);
  readonly redeemMessage = signal<{ text: string; ok: boolean } | null>(null);

  init(): void {
    this.referralService.getMine().subscribe({
      next: (referral) => {
        this.code.set(referral.code);
        this.referralCount.set(referral.referralCount);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goBack(): void {
    this.router.navigate(['/profile']);
  }

  copyLink(): void {
    if (this.justCopied()) return;
    const link = this.link();
    if (!link) return;
    navigator.clipboard
      ?.writeText(link)
      .then(() => {
        this.justCopied.set(true);
        setTimeout(() => this.justCopied.set(false), 2000);
      })
      .catch(() => undefined);
  }

  /** Mismo patron que GroupInviteFacade.shareLink: panel nativo de compartir si esta disponible, copiar si no. */
  async shareLink(): Promise<void> {
    const link = this.link();
    if (!link) return;

    const { value: canShare } = await Share.canShare();
    if (!canShare) {
      this.copyLink();
      return;
    }
    try {
      await Share.share({
        title: 'Únete a Piqo',
        text: 'Te invito a jugar a Piqo conmigo',
        url: link,
        dialogTitle: 'Compartir invitación',
      });
    } catch {
      // Cierra el panel sin elegir nada: no es un fallo que avisar.
    }
  }

  /** Mismo camino de enlace que abrir un link de invitacion (referralLinkGuard) — para quien recibio el codigo de palabra. */
  redeem(): void {
    const value = this.redeemInput().trim();
    if (!value || this.redeeming()) {
      return;
    }
    this.redeeming.set(true);
    this.redeemMessage.set(null);
    this.referralService.redeem(value).subscribe({
      next: (res) => {
        this.redeeming.set(false);
        this.redeemInput.set('');
        this.redeemMessage.set({ text: `¡Código aplicado! Invitado por ${res.referrerName}.`, ok: true });
      },
      error: (error: HttpErrorResponse) => {
        this.redeeming.set(false);
        this.redeemMessage.set({ text: error.error?.message ?? 'No se pudo aplicar el código', ok: false });
      },
    });
  }
}
