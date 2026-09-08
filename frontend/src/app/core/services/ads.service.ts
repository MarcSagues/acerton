import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';
import { environment } from '../../../environments/environment';

/**
 * Anuncios en la app nativa via AdMob (la web sigue usando AdSense, ver
 * index.html). No hace nada en web: Capacitor.isNativePlatform() es false
 * ahi y AdMob directamente no se inicializa.
 */
@Injectable({ providedIn: 'root' })
export class AdsService {
  private initialized = false;

  private get bannerAdUnitId(): string | null {
    if (Capacitor.getPlatform() === 'android') return environment.admob.android.bannerAdUnitId;
    if (Capacitor.getPlatform() === 'ios') return environment.admob.ios.bannerAdUnitId;
    return null;
  }

  async showBanner(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    const adUnitId = this.bannerAdUnitId;
    if (!adUnitId) return;

    if (!this.initialized) {
      await AdMob.initialize();
      // UMP: solo pide consentimiento si hace falta (usuario en UE/Reino Unido);
      // sin consentimiento explicito en esos casos no se piden anuncios.
      const consentInfo = await AdMob.requestConsentInfo();
      if (!consentInfo.canRequestAds) {
        await AdMob.showConsentForm();
      }
      this.initialized = true;
    }

    // El banner es una vista nativa superpuesta al WebView, no parte del DOM
    // — arriba para no tapar la barra inferior. Colocacion provisional solo
    // para verificar que AdMob funciona; la ubicacion definitiva es una
    // decision de producto aparte.
    await AdMob.showBanner({
      adId: adUnitId,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.TOP_CENTER,
    });
  }

  async hideBanner(): Promise<void> {
    if (!Capacitor.isNativePlatform() || !this.initialized) return;
    await AdMob.hideBanner();
  }
}
