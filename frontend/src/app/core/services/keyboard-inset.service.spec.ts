import { KeyboardInsetService, scrollDeltaToReveal } from './keyboard-inset.service';

describe('scrollDeltaToReveal', () => {
  it('0 si el campo ya queda a la vista con su margen', () => {
    expect(scrollDeltaToReveal(300, 500)).toBe(0);
    expect(scrollDeltaToReveal(484, 500)).toBe(0);
  });

  it('lo que falta para que el campo (con su margen) quede por encima del limite visible', () => {
    expect(scrollDeltaToReveal(500, 500)).toBe(16);
    expect(scrollDeltaToReveal(620, 500)).toBe(136);
    expect(scrollDeltaToReveal(620.4, 500)).toBe(137);
  });
});

/** Una pagina larga con un campo en lo mas bajo, como el marcador del ultimo partido en Jornada. */
describe('KeyboardInsetService', () => {
  const KEYBOARD = 300;
  const ACCESSORY = 48;
  let appRoot: HTMLElement;
  let field: HTMLInputElement;
  let service: KeyboardInsetService;

  beforeEach(() => {
    appRoot = document.createElement('app-root');
    appRoot.innerHTML = '<div style="height: 1800px"></div><input type="number" style="display:block;height:40px" />';
    document.body.appendChild(appRoot);
    field = appRoot.querySelector('input') as HTMLInputElement;
    service = new KeyboardInsetService();
    scroller().scrollTop = scroller().scrollHeight;
    field.focus();
  });

  afterEach(() => {
    service.hide();
    appRoot.remove();
    scroller().scrollTop = 0;
  });

  /** Como en la app real (styles.scss): html y body con overflow-x:hidden, asi que scrollea <body>. */
  const scroller = () => document.body;
  const hiddenBehindKeyboard = () => field.getBoundingClientRect().bottom > window.innerHeight - KEYBOARD - ACCESSORY;
  const settle = () => new Promise((resolve) => setTimeout(resolve, 900));

  it('en este documento scrollea body, no la ventana (por eso hay que buscar el contenedor)', () => {
    expect(document.body.scrollHeight).toBeGreaterThan(document.body.clientHeight);
    expect(document.documentElement.scrollHeight).toBe(document.documentElement.clientHeight);
  });

  it('sin el teclado, el campo del final de la pagina se ve (punto de partida)', () => {
    expect(field.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
  });

  it('con el teclado abierto, sube la pagina hasta dejar el campo encima del teclado y de la barra "Listo"', async () => {
    // Sin hueco ni desplazamiento, el teclado lo taparia.
    expect(hiddenBehindKeyboard()).toBeTrue();

    service.show(KEYBOARD);
    await settle();

    expect(document.documentElement.classList.contains('keyboard-open')).toBeTrue();
    expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe(`${KEYBOARD + ACCESSORY + 16}px`);
    expect(hiddenBehindKeyboard()).toBeFalse();
  });

  it('al pasar a otro campo con el teclado ya abierto, tambien lo deja a la vista', async () => {
    const other = document.createElement('input');
    other.style.cssText = 'display:block;height:40px';
    appRoot.appendChild(other);
    service.show(KEYBOARD);
    await settle();

    other.focus();
    service.revealFocusedField();
    await settle();

    expect(other.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight - KEYBOARD - ACCESSORY);
  });

  it('al cerrarse el teclado se quita el hueco y la clase', async () => {
    service.show(KEYBOARD);
    await settle();

    service.hide();

    expect(document.documentElement.classList.contains('keyboard-open')).toBeFalse();
    expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe('');
  });

  it('un campo que ya se ve no mueve la pagina', async () => {
    scroller().scrollTop = 0;
    const top = document.createElement('input');
    appRoot.prepend(top);
    top.focus();
    service.show(100); // teclado bajo: la ventana de pruebas es pequeña y con uno alto no cabria ni el campo de arriba
    await settle();

    expect(scroller().scrollTop).toBe(0);
  });
});
