import { Directive, ElementRef, EventEmitter, Input, NgZone, OnDestroy, OnInit, Output, inject } from '@angular/core';

/**
 * Emite `inView` cuando el elemento entra en pantalla (o esta a punto: `inViewMargin`). Sirve de centinela del scroll infinito: se pone
 * al final de la lista y, al verse, la pantalla carga la pagina siguiente. Cada centinela nuevo (otro elemento) vuelve a avisar, asi que
 * si tras cargar sigue a la vista, el siguiente centinela dispara otra carga.
 */
@Directive({ selector: '[appInView]', standalone: true })
export class InViewDirective implements OnInit, OnDestroy {
  @Output() inView = new EventEmitter<void>();
  @Input() inViewMargin = '320px';

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private observer: IntersectionObserver | null = null;

  ngOnInit(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) this.zone.run(() => this.inView.emit());
      },
      { rootMargin: this.inViewMargin },
    );
    this.observer.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
