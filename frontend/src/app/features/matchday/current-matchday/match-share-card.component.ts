import { CUSTOM_ELEMENTS_SCHEMA, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Match, PredictionChoice } from '../../../core/models/matchday.model';
import { DoubleChanceOption } from '../../../core/models/prediction.model';
import { ScoringMode } from '../../../core/models/group.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { drawCircleFill, drawRoundRect, drawText, ellipsizeText, loadCanvasImage, shortInitials } from '../../../shared/canvas-share/canvas-draw.util';
import { canvasToPngBlob, copyImageBlobToClipboard, shareOrDownloadImageBlob } from '../../../shared/canvas-share/share-image.util';
import { PredictionSelection, matchAccentTone, pointsForPrediction } from '../domain/prediction-rules';

/** Mismas parejas que DOUBLE_CHANCE_COVERAGE (prediction-rules.ts, privado ahi) — que casillas 1/X/2 cubre cada doble oportunidad. */
const DOUBLE_CHANCE_PAIRS: Record<DoubleChanceOption, PredictionChoice[]> = {
  HOME_OR_DRAW: ['HOME', 'DRAW'],
  DRAW_OR_AWAY: ['DRAW', 'AWAY'],
  HOME_OR_AWAY: ['HOME', 'AWAY'],
};

const ONE_X_TWO_OPTIONS: { choice: PredictionChoice; label: string }[] = [
  { choice: 'HOME', label: '1' },
  { choice: 'DRAW', label: 'X' },
  { choice: 'AWAY', label: '2' },
];

export interface MatchShareCardData {
  match: Match;
  competitionName: string | null;
  matchdayOrder: number;
  scoringMode: ScoringMode;
  selection: PredictionSelection;
  playerName: string;
  avatarBackground: string | null;
  groupName: string | null;
}

/**
 * Igual que MatchdayShareCardComponent pero para un solo partido, en
 * formato vertical 1080×1920 (9:16) pensado para Instagram Stories/Reels
 * en vez del cuadrado 1080×1080 de la jornada completa. Se abre desde el
 * botoncito de compartir de cada fila de partido (ver
 * CurrentMatchdayFacade.openMatchShareCard).
 */
@Component({
  selector: 'app-match-share-card',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <header class="share-head">
      <div>
        <p class="share-kicker">Lista para publicar</p>
        <h2 id="match-share-title">Comparte este partido</h2>
      </div>
      <button type="button" class="close-btn" aria-label="Cerrar" (click)="dialogRef.close()">
        <piqo-svg icon="cerrar" size="18"></piqo-svg>
      </button>
    </header>

    <div class="canvas-frame" [class.rendering]="rendering()">
      <canvas #shareCanvas width="1080" height="1920" aria-label="Vista previa del partido"></canvas>
    </div>

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
  `,
  styles: `
    :host {
      display: block;
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
      aspect-ratio: 9 / 16;
      max-height: min(70vh, 620px);
      margin: 0 auto;
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

    .share-actions {
      margin-top: 16px;
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
      .share-actions { grid-template-columns: 1fr; }
    }

    @keyframes shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
  `,
})
export class MatchShareCardComponent {
  private readonly toast = inject(ToastService);
  readonly dialogRef = inject(DialogRef<void, MatchShareCardComponent>);
  private readonly data = inject<MatchShareCardData>(DIALOG_DATA);

  @ViewChild('shareCanvas') private canvasRef?: ElementRef<HTMLCanvasElement>;

  readonly rendering = signal(true);
  readonly copying = signal(false);
  readonly justCopied = signal(false);
  private imageBlob: Blob | null = null;

  async ngAfterViewInit(): Promise<void> {
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await document.fonts?.ready;
      await this.drawCard();
      this.imageBlob = await this.canvasBlob();
    } catch {
      this.toast.show('No se pudo generar la imagen. Inténtalo de nuevo.');
    } finally {
      this.rendering.set(false);
    }
  }

  async shareImage(): Promise<void> {
    const blob = this.imageBlob ?? (await this.canvasBlob());
    if (!blob) return;

    const { match } = this.data;
    await shareOrDownloadImageBlob(
      blob,
      this.fileName(),
      {
        title: `Mi pronóstico en Piqo · ${match.homeTeam} - ${match.awayTeam}`,
        text: this.finished()
          ? `Así me ha ido en ${match.homeTeam} - ${match.awayTeam} en Piqo.`
          : `Mi pronóstico para ${match.homeTeam} - ${match.awayTeam} en Piqo.`,
      },
      this.toast,
      'Imagen descargada: ya puedes subirla a Instagram o compartirla donde quieras',
    );
  }

  async copyImage(): Promise<void> {
    if (this.copying() || this.justCopied()) return;
    const blob = this.imageBlob ?? (await this.canvasBlob());
    if (!blob) return;
    this.copying.set(true);
    try {
      await copyImageBlobToClipboard(blob);
      this.justCopied.set(true);
      setTimeout(() => this.justCopied.set(false), 2000);
    } catch {
      this.toast.show('No se pudo copiar la imagen. Usa "Compartir imagen" en su lugar.');
    } finally {
      this.copying.set(false);
    }
  }

  private finished(): boolean {
    return this.data.match.status === 'FINISHED';
  }

  private async drawCard(): Promise<void> {
    const canvas = this.canvasRef?.nativeElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) throw new Error('Canvas no disponible');

    const { match, scoringMode } = this.data;
    const width = canvas.width;
    const height = canvas.height;
    const exactScore = scoringMode === 'EXACT_SCORE';
    const finished = this.finished();
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#0c0f11';
    ctx.fillRect(0, 0, width, height);

    const bloom = ctx.createRadialGradient(width * 0.5, 40, 0, width * 0.5, 40, 900);
    bloom.addColorStop(0, 'rgba(210,190,148,.2)');
    bloom.addColorStop(.45, 'rgba(120,96,57,.08)');
    bloom.addColorStop(1, 'rgba(12,15,17,0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.strokeStyle = 'rgba(241,240,234,.04)';
    ctx.lineWidth = 1;
    for (let x = -600; x < width + 600; x += 56) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 620, height);
      ctx.stroke();
    }
    ctx.restore();

    await this.drawBrand(ctx);
    drawText(
      ctx,
      finished ? 'RESULTADO DEL PARTIDO' : 'MI PRONÓSTICO',
      72,
      206,
      21,
      700,
      '#d2be94',
      'Inter',
      .12,
    );
    const competitionLine = this.data.competitionName
      ? `${this.data.competitionName} · J${this.data.matchdayOrder}`
      : `Jornada ${this.data.matchdayOrder}`;
    drawText(ctx, ellipsizeText(ctx, competitionLine, width - 144, '700 32px Inter'), 72, 256, 32, 700, '#f1f0ea', 'Inter');
    drawText(ctx, this.kickoffLine(), 72, 296, 18, 600, '#9aa0a3', 'Inter');

    // Tarjeta unica al estilo del mock que paso el usuario (circulos de
    // equipo local/visitante + VS, casillas 1/X/2 con el nombre del equipo
    // debajo, marcador de resultado exacto como dos casillas + guion) —
    // fondo y logo se mantienen tal cual (peticion explicita), el resto
    // sigue ese diseño en vez del anterior (nombre+marcador en fila).
    const panelX = 72;
    const panelY = 350;
    const panelW = width - 144;
    const panelH = 920;
    const contentLeft = panelX + 56;
    const contentRight = panelX + panelW - 56;
    const centerX = width / 2;
    drawRoundRect(ctx, panelX, panelY, panelW, panelH, 36, 'rgba(241,240,234,.045)', 'rgba(241,240,234,.09)');

    const circleR = 96;
    const circleCenterY = panelY + 170;
    const homeCircleX = panelX + 88 + circleR;
    const awayCircleX = panelX + panelW - 88 - circleR;
    this.drawTeamCircle(ctx, match.homeTeam, homeCircleX, circleCenterY, circleR, 'filled');
    this.drawTeamCircle(ctx, match.awayTeam, awayCircleX, circleCenterY, circleR, 'outline');

    const nameY = panelY + 330;
    const nameMaxWidth = 320;
    drawText(ctx, ellipsizeText(ctx, match.homeTeam, nameMaxWidth, '700 40px Manrope'), homeCircleX, nameY, 40, 700, '#f1f0ea', 'Manrope', 0, 'center');
    drawText(ctx, ellipsizeText(ctx, match.awayTeam, nameMaxWidth, '700 40px Manrope'), awayCircleX, nameY, 40, 700, '#f1f0ea', 'Manrope', 0, 'center');

    if (finished) {
      const score = match.homeScore == null || match.awayScore == null ? '—' : `${match.homeScore} - ${match.awayScore}`;
      drawText(ctx, score, centerX, circleCenterY + 20, 58, 800, '#f1f0ea', 'Manrope', 0, 'center');
    } else {
      drawText(ctx, 'VS', centerX, circleCenterY + 16, 46, 800, 'rgba(241,240,234,.34)', 'Manrope', 0, 'center');
    }

    ctx.strokeStyle = 'rgba(241,240,234,.1)';
    ctx.beginPath();
    ctx.moveTo(contentLeft, panelY + 426);
    ctx.lineTo(contentRight, panelY + 426);
    ctx.stroke();

    const selection = this.data.selection;
    const boxY = panelY + 510;
    if (exactScore) {
      const boxSize = 220;
      const boxY2 = boxY + (241 - boxSize) / 2;
      const homeBoxX = centerX - boxSize - 50;
      const awayBoxX = centerX + 50;
      const homeVal = selection.predictedHomeScore == null ? '—' : String(selection.predictedHomeScore);
      const awayVal = selection.predictedAwayScore == null ? '—' : String(selection.predictedAwayScore);
      drawRoundRect(ctx, homeBoxX, boxY2, boxSize, boxSize, 24, '#d2be94');
      drawRoundRect(ctx, awayBoxX, boxY2, boxSize, boxSize, 24, '#14181a', '#d2be94', 5);
      drawText(ctx, homeVal, homeBoxX + boxSize / 2, boxY2 + boxSize * 0.62, 96, 800, '#121619', 'Manrope', 0, 'center');
      drawText(ctx, awayVal, awayBoxX + boxSize / 2, boxY2 + boxSize * 0.62, 96, 800, '#d2be94', 'Manrope', 0, 'center');
      drawText(ctx, '-', centerX, boxY2 + boxSize * 0.6, 56, 800, '#9aa0a3', 'Manrope', 0, 'center');
      if (selection.doublePointsWildcard) {
        drawText(ctx, 'COMODÍN x2', centerX, panelY + 780, 18, 700, '#d2be94', 'Inter', .1, 'center');
      }
    } else {
      // Las 3 casillas 1/X/2 siempre visibles, con el nombre del equipo (o
      // "Empate") debajo de cada una; la(s) elegida(s) en acento — con
      // doble oportunidad (p.ej. "1X"), las dos casillas que cubre se
      // pintan igual, no solo una.
      const covered: PredictionChoice[] = selection.doubleChanceOption
        ? DOUBLE_CHANCE_PAIRS[selection.doubleChanceOption]
        : selection.choice
          ? [selection.choice]
          : [];
      const boxGap = 27;
      const boxW = (contentRight - contentLeft - boxGap * 2) / 3;
      const boxH = 241;
      const captions: Record<PredictionChoice, string> = { HOME: match.homeTeam, DRAW: 'Empate', AWAY: match.awayTeam };
      ONE_X_TWO_OPTIONS.forEach((option, index) => {
        const boxX = contentLeft + index * (boxW + boxGap);
        const isSelected = covered.includes(option.choice);
        drawRoundRect(
          ctx,
          boxX,
          boxY,
          boxW,
          boxH,
          20,
          isSelected ? '#d2be94' : '#1a1d1f',
          isSelected ? undefined : 'rgba(210,190,148,.12)',
          isSelected ? undefined : 3,
        );
        const textColor = isSelected ? '#121619' : '#9aa0a3';
        drawText(ctx, option.label, boxX + boxW / 2, boxY + boxH * 0.52, 84, 800, textColor, 'Manrope', 0, 'center');
        drawText(ctx, ellipsizeText(ctx, captions[option.choice], boxW - 20, '700 30px Manrope'), boxX + boxW / 2, boxY + boxH * 0.82, 30, 700, textColor, 'Manrope', 0, 'center');
      });
    }

    if (finished) {
      const tone = matchAccentTone(match, selection, exactScore);
      const resultLineY = panelY + 850;
      if (tone === 'none') {
        drawText(ctx, 'No participado', centerX, resultLineY, 22, 600, '#9aa0a3', 'Inter', 0, 'center');
      } else {
        const points = pointsForPrediction(match, selection, exactScore);
        const hit = tone === 'hit' || tone === 'partial';
        const label = tone === 'hit' ? 'Acierto pleno' : tone === 'partial' ? 'Acierto del ganador' : 'Fallo';
        drawText(
          ctx,
          `${label} · ${points > 0 ? `+${points} pts` : '0 pts'}`,
          centerX,
          resultLineY,
          24,
          700,
          hit ? '#8fd4b3' : '#f1a4aa',
          'Inter',
          0,
          'center',
        );
      }
    }

    // Pie: jugador + grupo a la izquierda, marca a la derecha.
    const footerY = panelY + panelH + 70;
    ctx.strokeStyle = 'rgba(241,240,234,.1)';
    ctx.beginPath();
    ctx.moveTo(72, footerY);
    ctx.lineTo(width - 72, footerY);
    ctx.stroke();

    const avatarY = footerY + 60;
    drawCircleFill(ctx, 104, avatarY, 34, this.safeAvatarColor());
    drawText(ctx, shortInitials(this.data.playerName || 'Jugador', 2), 104, avatarY + 9, 23, 800, '#121619', 'Inter', 0, 'center');
    drawText(ctx, ellipsizeText(ctx, this.data.playerName || 'Jugador', width - 300, '700 28px Inter'), 154, avatarY - 6, 28, 700, '#f1f0ea', 'Inter');
    drawText(ctx, ellipsizeText(ctx, this.data.groupName || 'Mi grupo', width - 300, '500 20px Inter'), 154, avatarY + 26, 20, 500, '#9aa0a3', 'Inter');

    drawText(ctx, 'piqo.es', 72, height - 64, 26, 750, '#d2be94', 'Manrope');
    drawText(ctx, 'Pronostica · Compite · Pica', width - 72, height - 64, 18, 600, '#9aa0a3', 'Inter', 0, 'right');
  }

  private async drawBrand(ctx: CanvasRenderingContext2D): Promise<void> {
    try {
      const logo = await loadCanvasImage('/piqo/logo-oscuro.svg');
      ctx.drawImage(logo, 72, 60, 262, 83);
    } catch {
      drawText(ctx, 'piqo', 72, 118, 44, 800, '#f1f0ea', 'Manrope');
    }
  }

  /**
   * Circulo de equipo al estilo del mock: el local ("filled") va relleno
   * en acento con un leve oscurecido hacia la esquina inferior derecha; el
   * visitante ("outline") va oscuro con un aro en acento y el mismo
   * oscurecido pero con un tinte de acento en vez de negro — mismo
   * contraste relleno/contorno que ya usan las casillas de marcador
   * exacto (ver drawCard), aplicado tambien a los equipos.
   */
  private drawTeamCircle(
    ctx: CanvasRenderingContext2D,
    teamName: string,
    x: number,
    y: number,
    r: number,
    variant: 'filled' | 'outline',
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = variant === 'filled' ? '#d2be94' : '#14181a';
    ctx.fill();

    ctx.save();
    ctx.clip();
    const shade = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    if (variant === 'filled') {
      shade.addColorStop(0, 'rgba(0,0,0,0)');
      shade.addColorStop(.45, 'rgba(0,0,0,0)');
      shade.addColorStop(1, 'rgba(0,0,0,.28)');
    } else {
      shade.addColorStop(0, 'rgba(210,190,148,0)');
      shade.addColorStop(.45, 'rgba(210,190,148,0)');
      shade.addColorStop(1, 'rgba(210,190,148,.22)');
    }
    ctx.fillStyle = shade;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#d2be94';
    ctx.stroke();
    ctx.restore();

    drawText(ctx, shortInitials(teamName), x, y + r * 0.15, Math.round(r * 0.6), 800, variant === 'filled' ? '#121619' : '#d2be94', 'Manrope', 0, 'center');
  }

  private safeAvatarColor(): string {
    return this.data.avatarBackground && /^#[0-9a-f]{6}$/i.test(this.data.avatarBackground)
      ? this.data.avatarBackground
      : '#d2be94';
  }

  private kickoffLine(): string {
    const date = new Date(this.data.match.kickoff);
    const day = date.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit' });
    const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `${day} · ${time}`;
  }

  private canvasBlob(): Promise<Blob | null> {
    const canvas = this.canvasRef?.nativeElement;
    return canvas ? canvasToPngBlob(canvas) : Promise.resolve(null);
  }

  private fileName(): string {
    const teams = `${this.data.match.homeTeam}-${this.data.match.awayTeam}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `piqo-${teams}.png`;
  }
}
