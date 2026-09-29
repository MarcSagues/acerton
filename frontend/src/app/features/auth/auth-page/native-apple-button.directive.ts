import { AfterViewInit, Directive, ElementRef, EventEmitter, Input, NgZone, OnDestroy, Output, inject } from '@angular/core';
import { PluginListenerHandle, registerPlugin } from '@capacitor/core';
import { ThemeService } from '../../../core/services/theme.service';

interface AppleSignInButtonPlugin {
  show(options: {
    x: number;
    y: number;
    width: number;
    height: number;
    cornerRadius: number;
    enabled: boolean;
    style: 'black' | 'white';
  }): Promise<void>;
  hide(): Promise<void>;
  addListener(eventName: 'tap', listener: () => void): Promise<PluginListenerHandle>;
}

/** Plugin propio de la app iOS — ver ios/App/App/AppleSignInButtonPlugin.swift. */
const AppleSignInButton = registerPlugin<AppleSignInButtonPlugin>('AppleSignInButton');

/**
 * Coloca el boton nativo de Sign in with Apple (ASAuthorizationAppleIDButton)
 * exactamente encima del elemento que lleva esta directiva, que solo reserva
 * el hueco en el layout. App Review (Guideline 4) rechazo el boton HTML con
 * el logo dibujado a mano: el nativo lo pinta el sistema con el logo, la
 * tipografia y el texto oficiales.
 *
 * Como el boton vive fuera del DOM, su posicion se sincroniza en cada frame
 * (solo se llama al plugin cuando algo cambia: scroll dentro de <body>,
 * imagenes que terminan de cargar, rotacion o Split View en iPad, cambio de
 * tema...). Al destruirse (cambio a formulario de correo, login completado)
 * se retira el boton nativo.
 */
@Directive({
  selector: '[appNativeAppleButton]',
  standalone: true,
})
export class NativeAppleButtonDirective implements AfterViewInit, OnDestroy {
  @Input() disabled = false;
  @Output() readonly pressed = new EventEmitter<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly theme = inject(ThemeService);
  private frameId: number | null = null;
  private lastState: string | null = null;
  private tapListener: PluginListenerHandle | null = null;
  private destroyed = false;

  async ngAfterViewInit(): Promise<void> {
    const listener = await AppleSignInButton.addListener('tap', () => {
      this.zone.run(() => {
        if (!this.disabled) this.pressed.emit();
      });
    });
    if (this.destroyed) {
      void listener.remove();
      return;
    }
    this.tapListener = listener;
    this.zone.runOutsideAngular(() => this.syncFrame());
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    void this.tapListener?.remove();
    void AppleSignInButton.hide();
  }

  private readonly syncFrame = (): void => {
    const rect = this.host.nativeElement.getBoundingClientRect();
    const style = this.theme.effectiveTheme() === 'dark' ? 'white' : 'black';
    const options = {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      cornerRadius: 12,
      enabled: !this.disabled,
      style,
    } as const;
    const state = JSON.stringify(options);
    if (state !== this.lastState && options.width > 0 && options.height > 0) {
      this.lastState = state;
      void AppleSignInButton.show(options);
    }
    this.frameId = requestAnimationFrame(this.syncFrame);
  };
}
