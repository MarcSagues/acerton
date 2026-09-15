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

  private get rewardedAdUnitId(): string | null {
    if (Capacitor.getPlatform() === 'android') return environment.admob.android.rewardedAdUnitId;
    if (Capacitor.getPlatform() === 'ios') return environment.admob.ios.rewardedAdUnitId;
    return null;
  }

  async showBanner(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    const adUnitId = this.bannerAdUnitId;
    if (!adUnitId) return;

    await this.ensureInitialized();

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

  /**
   * Vídeo recompensado (comodín extra de remontada). true solo si el
   * usuario lo vio entero y AdMob confirmo la recompensa — showRewardVideoAd
   * no resuelve hasta que eso pasa (ver RewardDefinitions en el plugin), asi
   * que un simple await + try/catch basta: cualquier fallo (no cargo, el
   * usuario lo cerro a medias...) cae al catch y no se concede nada.
   * `userId` se manda para verificacion server-side (ssv) si algun dia se
   * configura un callback en el panel de AdMob — sin configurarlo no hace nada.
   */
  async watchRewardedAd(userId: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    const adUnitId = this.rewardedAdUnitId;
    if (!adUnitId) return false;

    try {
      await this.ensureInitialized();
      await AdMob.prepareRewardVideoAd({ adId: adUnitId, ssv: { userId } });
      await AdMob.showRewardVideoAd();
      return true;
    } catch {
      return false;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    await AdMob.initialize();
    // UMP: solo pide consentimiento si hace falta (usuario en UE/Reino Unido);
    // sin consentimiento explicito en esos casos no se piden anuncios.
    const consentInfo = await AdMob.requestConsentInfo();
    if (!consentInfo.canRequestAds) {
      await AdMob.showConsentForm();
    }
    this.initialized = true;
  }
}
