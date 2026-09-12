import { CUSTOM_ELEMENTS_SCHEMA, Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Los 3 estados vacíos del arnés de demo del prototipo (sin-grupos,
 * sin-conexión, permiso bloqueado) generalizados como componente
 * reutilizable, montado donde corresponda de verdad en vez de como
 * pantalla de demo suelta.
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="empty" [class.large]="large" [class.standalone]="standalone">
      <div class="hero-icon" [class.large]="large">
        <div class="hero-icon-gap">
          <div class="hero-icon-inner">
            <piqo-svg [attr.icon]="icon" [attr.size]="large ? 44 : 28"></piqo-svg>
          </div>
        </div>
      </div>
      <h2>{{ title }}</h2>
      <p>{{ text }}</p>
      @if (ctaLabel) {
        <button type="button" class="piqo-primary cta" (click)="cta.emit()">{{ ctaLabel }}</button>
      }
      @if (cta2Label) {
        <button type="button" class="piqo-secondary cta" (click)="cta2.emit()">{{ cta2Label }}</button>
      }
    </div>
  `,
  styles: [
    `
      .empty {
        padding: 40px 32px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 12px;
        color: var(--p4-text);
      }
      /* Mismo padding lateral y tamano de botones que "Unirse a un grupo"
         (group-join-code), usado como referencia para el estado vacio de
         "Todavia no estas en ningun grupo". */
      .empty.large {
        padding: 24px 20px 40px;
        gap: 14px;
      }
      /* Solo en /welcome (fuera del shell, sin barra superior ni cabecera
         con boton de volver que si tiene "Unirse a un grupo") se reserva
         ese mismo hueco a mano (medido: 142px con safe-area-inset-top en
         0) para que el icono no salte de posicion al navegar entre
         pantallas. Dentro del shell (/groups) ya hay una barra superior
         real encima — usar este mismo padding ahi duplicaria el hueco. */
      .empty.large.standalone {
        padding-top: calc(env(safe-area-inset-top) + 128px);
      }
      .hero-icon {
        width: 96px;
        height: 96px;
        border-radius: 50%;
        background: var(--p4-soft);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 4px;
      }
      /* Mismo patron de circulo (anillo fino + hueco de fondo de pagina +
         circulo solido con el icono) que la pagina de error y la de
         Unirse a un grupo, para que cualquier estado vacio de la app se
         lea igual. */
      .hero-icon-gap {
        width: 88px;
        height: 88px;
        border-radius: 50%;
        background: var(--p4-bg);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .hero-icon-inner {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--p4-accent-gradient);
        color: var(--p4-on-accent);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      /* Mismo tamano que el circulo de "Unirse a un grupo"
         (group-join-code), usado como referencia para el estado vacio de
         "Todavia no estas en ningun grupo". */
      .hero-icon.large {
        width: 144px;
        height: 144px;
      }
      .hero-icon.large .hero-icon-gap {
        width: 136px;
        height: 136px;
      }
      .hero-icon.large .hero-icon-inner {
        width: 88px;
        height: 88px;
      }
      h2 {
        margin: 0;
        font: 700 16px/1.3 var(--p4-font-display);
      }
      p {
        margin: 0;
        font: 400 13px/1.5 var(--p4-font-ui);
        color: var(--p4-muted);
        max-width: 280px;
      }
      .cta {
        min-height: var(--p4-touch);
        min-width: 200px;
        border-radius: var(--p4-radius-sm);
        font: 600 14px/1 var(--p4-font-ui);
        margin-top: 8px;
      }
      .empty.large .cta {
        width: 100%;
        margin-top: 0;
        font: 600 15px/1 var(--p4-font-ui);
      }
    `,
  ],
})
export class EmptyStateComponent {
  @Input() icon = 'info';
  @Input() large = false;
  /** true solo cuando este componente vive en una ruta sin barra superior propia (ver .empty.large.standalone). */
  @Input() standalone = false;
  @Input() title = '';
  @Input() text = '';
  @Input() ctaLabel?: string;
  @Input() cta2Label?: string;
  @Output() cta = new EventEmitter<void>();
  @Output() cta2 = new EventEmitter<void>();
}
