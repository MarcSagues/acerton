import { ToastService } from '../ui/toast/toast.service';

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

export function downloadImageBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Abre el panel nativo (Web Share) cuando admite archivos; si el
 * navegador no lo soporta, descarga el PNG directamente como alternativa.
 */
export async function shareOrDownloadImageBlob(
  blob: Blob,
  fileName: string,
  shareMeta: { title: string; text: string },
  toast: ToastService,
  downloadedMessage: string,
): Promise<void> {
  const file = new File([blob], fileName, { type: 'image/png' });
  const shareData: ShareData = { ...shareMeta, files: [file] };
  const canShareFile = !navigator.canShare || navigator.canShare({ files: [file] });
  if (navigator.share && canShareFile) {
    try {
      await navigator.share(shareData);
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }
  downloadImageBlob(blob, fileName);
  toast.show(downloadedMessage);
}

/**
 * Con timeout: en algun WebView/navegador la promesa del portapapeles se
 * queda colgada sin resolver ni rechazar nunca (visto en pruebas) en vez de
 * fallar rapido — sin este limite el boton "Copiar" se quedaria
 * deshabilitado para siempre esperando algo que no llega.
 */
export async function copyImageBlobToClipboard(blob: Blob): Promise<void> {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    throw new Error('Clipboard API no disponible');
  }
  await Promise.race([
    navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
  ]);
}
