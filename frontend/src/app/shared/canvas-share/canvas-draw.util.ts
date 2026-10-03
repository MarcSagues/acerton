/**
 * Primitivas de dibujado compartidas entre las tarjetas de "compartir
 * imagen" (jornada completa y partido individual, ver
 * matchday-share-card.component.ts y match-share-card.component.ts).
 */

/**
 * Traza el contorno a mano con arcTo en vez de
 * CanvasRenderingContext2D.roundRect: ese metodo no existe en WebKit
 * anterior a iOS 16.4, y el minimo soportado por la app es iOS 15 — sin
 * esto, la primera llamada lanzaba una excepcion a mitad del dibujado y
 * dejaba la tarjeta entera en el fondo liso.
 */
export function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
  stroke?: string,
  strokeWidth = 1,
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
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

export function drawCircleFill(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, fill: string): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function drawRingStroke(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  stroke: string,
  lineWidth: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.restore();
}

export function drawText(
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

export function ellipsizeText(ctx: CanvasRenderingContext2D, value: string, maxWidth: number, font: string): string {
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

export function loadCanvasImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    image.src = src;
  });
}

/** Iniciales cortas para un nombre de equipo/jugador cuando no hay logo/foto que pintar en el canvas. */
export function shortInitials(name: string, maxChars = 3): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return words.slice(0, maxChars).map((word) => word[0]!.toUpperCase()).join('');
  }
  return (words[0] ?? '?').slice(0, maxChars).toUpperCase();
}
