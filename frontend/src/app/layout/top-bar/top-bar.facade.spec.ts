import { routeHasGroupSwitcher } from './top-bar.facade';

describe('routeHasGroupSwitcher', () => {
  it('Jornada y Tabla llevan el selector de grupo', () => {
    expect(routeHasGroupSwitcher('/matchday')).toBeTrue();
    expect(routeHasGroupSwitcher('/rankings')).toBeTrue();
  });

  it('sus subpantallas no lo llevan (resultados, calendario, historial...)', () => {
    for (const path of ['/matchday/abc/results', '/matchday/calendar', '/matchday/history']) {
      expect(routeHasGroupSwitcher(path)).withContext(path).toBeFalse();
    }
  });

  it('el resto de pantallas no lo llevan', () => {
    for (const path of ['/groups', '/quiz', '/quiz/abc', '/profile', '/profile/settings/name', '/notifications']) {
      expect(routeHasGroupSwitcher(path)).withContext(path).toBeFalse();
    }
  });

  it('no confunde rutas que solo empiezan igual', () => {
    expect(routeHasGroupSwitcher('/matchdays-archive')).toBeFalse();
  });
});
