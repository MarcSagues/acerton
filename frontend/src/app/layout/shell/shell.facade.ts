import { Injectable, inject } from '@angular/core';
import { AdsService } from '../../core/services/ads.service';

@Injectable()
export class ShellFacade {
  private readonly ads = inject(AdsService);

  init(): void {
    this.ads.showBanner();
  }
}
