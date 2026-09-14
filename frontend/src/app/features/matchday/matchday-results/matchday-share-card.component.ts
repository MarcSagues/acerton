import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  ElementRef,
  HostListener,
  Input,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { Matchday } from '../../../core/models/matchday.model';
import { Prediction } from '../../../core/models/prediction.model';
import { ScoringMode } from '../../../core/models/group.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-matchday-share-card',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @if (visible()) {
      <div class="share-backdrop" (click)="close()">
        <section
          class="share-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-title"
          (click)="$event.stopPropagation()"
        >
          <header class="share-head">
            <div>
              <p class="share-kicker">Lista para publicar</p>
              <h2 id="share-title">Comparte tu jornada</h2>
            </div>
            <button type="button" class="close-btn" aria-label="Cerrar" (click)="close()">
              <piqo-svg icon="cerrar" size="18"></piqo-svg>
            </button>
          </header>

          <div class="canvas-frame" [class.rendering]="rendering()">
            <canvas #shareCanvas width="1080" height="1080" aria-label="Vista previa de los resultados"></canvas>
          </div>

          <p class="share-hint">Formato cuadrado 1080 × 1080, preparado para X, Instagram y mensajería.</p>
          <div class="share-actions">
            <button type="button" class="piqo-primary" [disabled]="rendering()" (click)="shareImage()">
              <piqo-svg icon="compartir" size="18"></piqo-svg>
              Compartir imagen
            </button>
            <button type="button" class="piqo-secondary" [disabled]="rendering() || copying() || justCopied()" (click)="copyImage()">
              <piqo-svg [attr.icon]="justCopied() ? 'check' : 'copiar'" size="18"></piqo-svg>
              {{ justCopied() ? 'Copiada' : copying() ? 'Copiando…' : 'Copiar' }}
            </button>
          </div>
        </section>
      </div>
    }
  `,
  styles: `
    .share-backdrop {
      position: fixed;
      inset: 0;
      z-index: 40;
      padding: 24px 18px max(24px, env(safe-area-inset-bottom));
      background: var(--scrim);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: shareFade 160ms ease-out;
    }

    .share-sheet {
      width: min(100%, 480px);
      max-height: calc(100dvh - 48px);
      overflow-y: auto;
      border-radius: var(--p4-radius-lg);
      border: 1px solid var(--p4-border);
      background: var(--p4-sheet-bg);
      box-shadow: var(--shadow-dialog-strong);
      padding: 18px;
      backdrop-filter: blur(22px);
      animation: shareUp 220ms cubic-bezier(.2,.8,.2,1);
    }

    .share-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
    }

    .share-kicker {
      margin: 0 0 5px;
      color: var(--p4-accent);
      font: 700 10px/1 var(--p4-font-ui);
      letter-spacing: .12em;
      text-transform: uppercase;
    }

    h2 {
      margin: 0;
      color: var(--p4-text);
      font: 700 20px/1.15 var(--p4-font-display);
    }

    .close-btn {
      width: 34px;
      height: 34px;
      flex: none;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: var(--p4-surface-2);
      color: var(--p4-muted);
      display: grid;
      place-items: center;
    }

    .canvas-frame {
      position: relative;
      overflow: hidden;
      aspect-ratio: 1;
      border-radius: 18px;
      background: #0c0f11;
      box-shadow: 0 16px 36px rgba(0,0,0,.28);
    }

    .canvas-frame.rendering::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(105deg, transparent 35%, rgba(210,190,148,.12) 50%, transparent 65%);
      animation: shimmer 1s linear infinite;
    }

    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }

    .share-hint {
      margin: 14px 2px;
      color: var(--p4-muted);
      font: 400 11px/1.45 var(--p4-font-ui);
    }

    .share-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .share-actions button {
      min-height: var(--p4-touch);
      padding: 0 12px;
      border-radius: var(--p4-radius-sm);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font: 600 14px/1 var(--p4-font-ui);
    }

    @media (max-width: 390px) {
      .share-backdrop { padding-inline: 12px; }
      .share-sheet { padding: 15px; }
      .share-actions { grid-template-columns: 1fr; }
    }

    @keyframes shareFade { from { opacity: 0; } }
    @keyframes shareUp { from { opacity: 0; transform: translateY(16px) scale(.98); } }
    @keyframes shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
  `,
})
export class MatchdayShareCardComponent {
  private readonly toast = inject(ToastService);

  @Input({ required: true }) matchday!: Matchday;
  @Input() competitionName: string | null = null;
  @Input() variant: 'picks' | 'results' = 'results';
  @Input({ required: true }) predictions: Prediction[] = [];
  @Input({ required: true }) scoringMode: ScoringMode = 'ONE_X_TWO';
  @Input({ required: true }) playerName = '';
  @Input() avatarBackground: string | null = null;
  @Input() groupName: string | null = null;
  @Input({ required: true }) totalPoints = 0;
  @Input({ required: true }) hits = 0;
  @Input() position: { pos: number; total: number } | null = null;
  @Input() streak = 0;

  @ViewChild('shareCanvas') private canvasRef?: ElementRef<HTMLCanvasElement>;

  readonly visible = signal(false);
  readonly rendering = signal(false);
  readonly copying = signal(false);
  readonly justCopied = signal(false);
  private imageBlob: Blob | null = null;

  async open(): Promise<void> {
    this.visible.set(true);
    this.rendering.set(true);
    this.imageBlob = null;
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await document.fonts?.ready;
      await this.drawCard();
      this.imageBlob = await this.canvasBlob();
    } catch {
      // Sin esto, un fallo de dibujado (p.ej. una API de canvas que un
      // WebView concreto no soporte) dejaba el shimmer de "generando"
      // girando para siempre y los botones deshabilitados sin explicacion.
      this.toast.show('No se pudo generar la imagen. Inténtalo de nuevo.');
    } finally {
      this.rendering.set(false);
    }
  }

  close(): void {
    this.visible.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visible()) this.close();
  }

  async shareImage(): Promise<void> {
    const blob = this.imageBlob ?? (await this.canvasBlob());
    if (!blob) return;

    const file = new File([blob], this.fileName(), { type: 'image/png' });
    const shareData: ShareData = {
      files: [file],
      title: `Mi jornada en Piqo · ${this.competitionLabel()}`,
      text: this.variant === 'picks'
        ? `Estos son mis pronósticos para la jornada ${this.matchday.order} en Piqo.`
        : `He sumado ${this.totalPoints} puntos en la jornada ${this.matchday.order} de Piqo.`,
    };

    const canShareFile = !navigator.canShare || navigator.canShare({ files: [file] });
    if (navigator.share && canShareFile) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    this.downloadBlob(blob);
    this.toast.show('Imagen descargada: ya puedes subirla a X o compartirla donde quieras');
  }

  /** Descargar como archivo ya lo cubre "Compartir imagen" (el panel nativo deja guardarla); este botón es solo para pegarla directo en otra app/chat. */
  async copyImage(): Promise<void> {
    if (this.copying() || this.justCopied()) return;
    const blob = this.imageBlob ?? (await this.canvasBlob());
    if (!blob) return;
    this.copying.set(true);
    try {
      if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
        throw new Error('Clipboard API no disponible');
      }
      // Con timeout: en algun WebView/navegador la promesa del portapapeles
      // se queda colgada sin resolver ni rechazar nunca (visto en pruebas)
      // en vez de fallar rapido — sin este limite el boton se quedaria
      // "Copiar" deshabilitado para siempre esperando algo que no llega.
      await Promise.race([
        navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
      ]);
      this.justCopied.set(true);
      setTimeout(() => this.justCopied.set(false), 2000);
    } catch {
      this.toast.show('No se pudo copiar la imagen. Usa "Compartir imagen" en su lugar.');
    } finally {
      this.copying.set(false);
    }
  }

  private async drawCard(): Promise<void> {
    const canvas = this.canvasRef?.nativeElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#0c0f11';
    ctx.fillRect(0, 0, width, height);

    const bloom = ctx.createRadialGradient(900, 80, 0, 900, 80, 650);
    bloom.addColorStop(0, 'rgba(210,190,148,.22)');
    bloom.addColorStop(.45, 'rgba(120,96,57,.09)');
    bloom.addColorStop(1, 'rgba(12,15,17,0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.strokeStyle = 'rgba(241,240,234,.045)';
    ctx.lineWidth = 1;
    for (let x = -400; x < 1300; x += 52) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 540, 1080);
      ctx.stroke();
    }
    ctx.restore();

    await this.drawBrand(ctx);
    this.text(ctx, this.variant === 'picks' ? 'MI QUINIELA' : 'RESULTADOS DE LA JORNADA', 72, 176, 22, 700, '#d2be94', 'Inter', .12);
    this.text(
      ctx,
      `${this.competitionLabel()} · J${this.matchday.order}`,
      72,
      222,
      29,
      700,
      '#f1f0ea',
      'Inter',
    );

    this.circle(ctx, 104, 292, 34, this.safeAvatarColor());
    this.text(ctx, this.initials(), 104, 301, 23, 800, '#121619', 'Inter', 0, 'center');
    this.text(ctx, this.ellipsize(ctx, this.playerName || 'Jugador', 360, '700 28px Inter'), 154, 286, 28, 700, '#f1f0ea', 'Inter');
    this.text(ctx, this.ellipsize(ctx, this.groupName || 'Mi grupo', 360, '500 20px Inter'), 154, 318, 20, 500, '#9aa0a3', 'Inter');

    this.text(ctx, this.variant === 'picks' ? 'JORNADA' : 'PUNTOS', 72, 392, 19, 700, '#9aa0a3', 'Inter', .13);
    this.text(ctx, String(this.variant === 'picks' ? this.matchday.order : this.totalPoints), 66, 520, 144, 750, '#f1f0ea', 'Manrope');

    if (this.variant === 'picks') {
      this.statBox(ctx, 520, 368, 218, 160, 'PRONÓSTICOS', `${this.predictions.length}/${this.matchday.matches.length}`);
      this.statBox(ctx, 758, 368, 250, 160, 'MODO', this.scoringMode === 'EXACT_SCORE' ? 'Marcador' : '1X2');
    } else {
      this.statBox(ctx, 520, 368, 218, 160, this.scoringMode === 'EXACT_SCORE' ? 'ACIERTOS' : 'ACIERTOS 1X2', `${this.hits}/${this.predictions.length}`);
      this.statBox(ctx, 758, 368, 250, 160, 'PUESTO', this.position ? `${this.position.pos}º de ${this.position.total}` : '—');
    }

    const extra = this.variant === 'picks'
      ? 'Pronósticos guardados'
      : this.streak > 0 ? `${this.streak} jornadas seguidas` : 'Sigue sumando';
    this.text(ctx, this.variant === 'picks' ? 'MIS PRONÓSTICOS' : 'MI DESGLOSE', 72, 600, 19, 700, '#d2be94', 'Inter', .13);
    this.text(ctx, extra, 1008, 600, 18, 600, '#9aa0a3', 'Inter', 0, 'right');

    const shown = this.predictions.filter((prediction) => this.pickLabel(prediction) !== '?').slice(0, 10);
    shown.forEach((prediction, index) => {
      const column = index >= 5 ? 1 : 0;
      const row = index % 5;
      this.predictionRow(ctx, prediction, 72 + column * 486, 632 + row * 68, 462);
    });

    if (shown.length === 0) {
      this.text(ctx, 'Sin pronósticos registrados', 72, 686, 24, 600, '#9aa0a3', 'Inter');
    }

    ctx.strokeStyle = 'rgba(241,240,234,.1)';
    ctx.beginPath();
    ctx.moveTo(72, 1002);
    ctx.lineTo(1008, 1002);
    ctx.stroke();
    this.text(ctx, 'piqo.es', 72, 1042, 22, 750, '#d2be94', 'Manrope');
    this.text(ctx, 'Pronostica · Compite · Pica', 1008, 1042, 18, 600, '#9aa0a3', 'Inter', 0, 'right');
  }

  private async drawBrand(ctx: CanvasRenderingContext2D): Promise<void> {
    try {
      const logo = await this.loadImage('/piqo/logo-oscuro.svg');
      ctx.drawImage(logo, 72, 66, 174, 55);
    } catch {
      this.text(ctx, 'piqo', 72, 112, 52, 800, '#f1f0ea', 'Manrope');
    }
  }

  private statBox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    value: string,
  ): void {
    this.roundRect(ctx, x, y, width, height, 26, 'rgba(241,240,234,.065)', 'rgba(241,240,234,.1)');
    this.text(ctx, label, x + 28, y + 48, 16, 700, '#9aa0a3', 'Inter', .1);
    this.text(ctx, value, x + 28, y + 119, value.length > 7 ? 37 : 48, 750, '#f1f0ea', 'Manrope');
  }

  private predictionRow(ctx: CanvasRenderingContext2D, prediction: Prediction, x: number, y: number, width: number): void {
    const match = this.matchday.matches.find((candidate) => candidate.id === prediction.matchId);
    if (!match) return;

    const points = prediction.pointsEarned;
    const hit = (points ?? 0) > 0;
    this.roundRect(ctx, x, y, width, 54, 15, 'rgba(241,240,234,.05)');

    const teams = this.ellipsize(ctx, `${match.homeTeam} · ${match.awayTeam}`, width - 164, '600 17px Inter');
    this.text(ctx, teams, x + 18, y + 33, 17, 600, '#f1f0ea', 'Inter');

    if (this.variant === 'results') {
      const score = match.homeScore == null || match.awayScore == null ? '—' : `${match.homeScore}-${match.awayScore}`;
      this.text(ctx, score, x + width - 104, y + 33, 17, 700, '#9aa0a3', 'Inter', 0, 'right');
    }

    this.roundRect(ctx, x + width - 88, y + 11, 38, 32, 9, this.variant === 'picks' ? '#373126' : hit ? '#193c30' : '#43272e');
    this.text(ctx, this.pickLabel(prediction), x + width - 69, y + 33, 15, 800, this.variant === 'picks' ? '#d2be94' : hit ? '#91c7ae' : '#f1a4aa', 'Inter', 0, 'center');
    if (this.variant === 'results') {
      this.text(ctx, points == null ? '—' : points > 0 ? `+${points}` : '0', x + width - 16, y + 33, 15, 800, hit ? '#91c7ae' : '#9aa0a3', 'Inter', 0, 'right');
    }
  }

  private pickLabel(prediction: Prediction): string {
    if (this.scoringMode === 'EXACT_SCORE') {
      return prediction.predictedHomeScore == null || prediction.predictedAwayScore == null
        ? '?'
        : `${prediction.predictedHomeScore}-${prediction.predictedAwayScore}`;
    }
    if (prediction.doubleChanceOption) {
      return { HOME_OR_DRAW: '1X', DRAW_OR_AWAY: 'X2', HOME_OR_AWAY: '12' }[prediction.doubleChanceOption];
    }
    return prediction.choice === 'HOME' ? '1' : prediction.choice === 'AWAY' ? '2' : prediction.choice === 'DRAW' ? 'X' : '?';
  }

  private text(
    ctx: CanvasRenderingContext2D,
    value: string,
    x: number,
    y: number,
    size: number,
    weight: number,
    color: string,
    family: string,
    spacing = 0,
    align: CanvasTextAlign = 'left',
  ): void {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${family}, system-ui, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    if (!spacing) {
      ctx.fillText(value, x, y);
    } else {
      const chars = [...value];
      const widths = chars.map((char) => ctx.measureText(char).width);
      const total = widths.reduce((sum, width) => sum + width, 0) + spacing * size * (chars.length - 1);
      let cursor = align === 'right' ? x - total : align === 'center' ? x - total / 2 : x;
      chars.forEach((char, index) => {
        ctx.fillText(char, cursor, y);
        cursor += widths[index] + spacing * size;
      });
    }
    ctx.restore();
  }

  /**
   * Traza el contorno a mano con arcTo en vez de CanvasRenderingContext2D.roundRect:
   * ese metodo no existe en WebKit anterior a iOS 16.4, y el minimo soportado
   * por la app es iOS 15 — sin esto, la primera llamada lanzaba una excepcion
   * a mitad de drawCard() y dejaba la tarjeta entera en el fondo negro liso
   * (el unico fillRect que ya se habia pintado antes de fallar).
   */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fill: string,
    stroke?: string,
  ): void {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arcTo(x + width, y, x + width, y + r, r);
    ctx.lineTo(x + width, y + height - r);
    ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
    ctx.lineTo(x + r, y + height);
    ctx.arcTo(x, y + height, x, y + height - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  private circle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, fill: string): void {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  private initials(): string {
    return (this.playerName || 'P')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }

  private safeAvatarColor(): string {
    return this.avatarBackground && /^#[0-9a-f]{6}$/i.test(this.avatarBackground)
      ? this.avatarBackground
      : '#d2be94';
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
      image.src = src;
    });
  }

  private ellipsize(ctx: CanvasRenderingContext2D, value: string, maxWidth: number, font: string): string {
    ctx.save();
    ctx.font = font;
    if (ctx.measureText(value).width <= maxWidth) {
      ctx.restore();
      return value;
    }
    let shortened = value;
    while (shortened.length > 1 && ctx.measureText(`${shortened}…`).width > maxWidth) shortened = shortened.slice(0, -1);
    ctx.restore();
    return `${shortened}…`;
  }

  private canvasBlob(): Promise<Blob | null> {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return Promise.resolve(null);
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }

  private downloadBlob(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = this.fileName();
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private fileName(): string {
    const competition = this.competitionLabel().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `piqo-${competition}-j${this.matchday.order}.png`;
  }

  private competitionLabel(): string {
    return this.competitionName ?? this.matchday.competition?.name ?? 'Competición';
  }
}
