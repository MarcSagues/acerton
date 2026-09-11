import { Injectable, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'piqo-theme';
const THEME_COLOR = { light: '#f1f0ea', dark: '#0b0e10' };

/**
 * Aplica la preferencia de tema (Claro/Oscuro/Automatico) como atributo
 * data-theme en <html>. "Automatico" significa ausencia del atributo: los
 * tokens de styles.scss ya resuelven ese caso via prefers-color-scheme.
 * Tambien mantiene sincronizado <meta name="theme-color"> (color de la
 * barra del navegador/estado) con el tema efectivo, incluido el caso
 * Automatico cuando cambia el tema del sistema en caliente.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly preference = signal<ThemePreference>(this.readStored());
  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    this.media.addEventListener('change', () => {
      if (this.preference() === 'auto') this.syncMetaThemeColor();
    });
    this.apply(this.preference());
  }

  setPreference(pref: ThemePreference): void {
    this.preference.set(pref);
    try {
      localStorage.setItem(STORAGE_KEY, pref);
    } catch {
      // Privado/sin storage: la preferencia solo dura la sesion actual.
    }
    this.apply(pref);
  }

  private readStored(): ThemePreference {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored;
    } catch {
      // Privado/sin storage: se usa Automatico por defecto.
    }
    return 'auto';
  }

  private apply(pref: ThemePreference): void {
    const root = document.documentElement;
    if (pref === 'auto') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', pref);
    }
    this.syncMetaThemeColor();
  }

  private syncMetaThemeColor(): void {
    const pref = this.preference();
    const effective: 'light' | 'dark' = pref === 'auto' ? (this.media.matches ? 'dark' : 'light') : pref;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', THEME_COLOR[effective]);
  }
}
