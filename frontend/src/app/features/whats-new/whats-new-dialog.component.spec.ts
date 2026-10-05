import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { setLanguageForTests } from '../../core/i18n/translate';
import { WhatsNewDialogComponent, WhatsNewDialogData } from './whats-new-dialog.component';

const entry = (version: string, es: string, en: string) => ({ version, date: '2026-01-01', changes: [{ es, en }] });

describe('WhatsNewDialogComponent', () => {
  const close = jasmine.createSpy('close');

  function render(data: WhatsNewDialogData): HTMLElement {
    TestBed.configureTestingModule({
      imports: [WhatsNewDialogComponent],
      providers: [
        { provide: DIALOG_DATA, useValue: data },
        { provide: DialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(WhatsNewDialogComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => setLanguageForTests('es'));

  it('con una sola versión: título con la versión y su lista, sin cabecera por versión', () => {
    const el = render({ version: '1.1.0', entries: [entry('1.1.0', 'Cosa nueva', 'New thing')] });

    expect(el.querySelector('.title')?.textContent).toContain('Novedades de la versión 1.1.0');
    expect(Array.from(el.querySelectorAll('li')).map((li) => li.textContent?.trim())).toEqual(['Cosa nueva']);
    expect(el.querySelector('.entry-version')).toBeNull();
  });

  it('con varias versiones: cada una con su cabecera', () => {
    const el = render({
      version: '1.2.0',
      entries: [entry('1.2.0', 'Dos', 'Two'), entry('1.1.0', 'Uno', 'One')],
    });

    expect(el.querySelector('.title')?.textContent).toContain('Novedades desde tu última versión');
    expect(Array.from(el.querySelectorAll('.entry-version')).map((h) => h.textContent?.trim())).toEqual([
      'Versión 1.2.0',
      'Versión 1.1.0',
    ]);
  });

  it('en inglés usa los textos en inglés', () => {
    setLanguageForTests('en');
    const el = render({ version: '1.1.0', entries: [entry('1.1.0', 'Cosa nueva', 'New thing')] });

    expect(el.querySelector('.title')?.textContent).toContain("What's new in version 1.1.0");
    expect(Array.from(el.querySelectorAll('li')).map((li) => li.textContent?.trim())).toEqual(['New thing']);
  });

  it('el botón cierra el aviso', () => {
    const el = render({ version: '1.1.0', entries: [entry('1.1.0', 'a', 'b')] });

    (el.querySelector('button.primary') as HTMLButtonElement).click();

    expect(close).toHaveBeenCalled();
  });
});
