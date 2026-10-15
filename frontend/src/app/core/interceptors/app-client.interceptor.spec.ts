import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CHANGELOG } from '../changelog/changelog';
import { appClientInfo, compareVersions } from '../app-client/app-client';
import { AppGateService } from '../app-client/app-gate.service';
import { appClientInterceptor } from './app-client.interceptor';

/** La version se lee de forma asincrona antes de mandar la peticion. */
const settle = async (): Promise<void> => {
  await appClientInfo();
  await new Promise((resolve) => setTimeout(resolve));
};

describe('appClientInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let gate: AppGateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([appClientInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    gate = TestBed.inject(AppGateService);
  });

  afterEach(() => controller.verify());

  it('manda plataforma y version a nuestra API (en la web, la ultima del historial)', async () => {
    http.get(`${environment.apiUrl}/groups/mine`).subscribe();
    await settle();
    const { headers } = controller.expectOne(`${environment.apiUrl}/groups/mine`).request;
    expect(headers.get('X-App-Platform')).toBe('web');
    expect(headers.get('X-App-Version')).toBe(CHANGELOG[0].version);
  });

  it('no las manda a otros servidores', () => {
    http.get('https://example.com/data.json').subscribe();
    expect(controller.expectOne('https://example.com/data.json').request.headers.has('X-App-Version')).toBe(false);
  });

  it('un 503 de mantenimiento enseña la pantalla de mantenimiento; otro 503 no', async () => {
    http.get(`${environment.apiUrl}/a`).subscribe({ error: () => undefined });
    await settle();
    controller.expectOne(`${environment.apiUrl}/a`).flush({ statusCode: 503 }, { status: 503, statusText: 'Unavailable' });
    expect(gate.state()).toBe('open');

    http.get(`${environment.apiUrl}/b`).subscribe({ error: () => undefined });
    await settle();
    controller
      .expectOne(`${environment.apiUrl}/b`)
      .flush({ statusCode: 503, maintenance: true }, { status: 503, statusText: 'Unavailable' });
    expect(gate.state()).toBe('maintenance');
  });
});

describe('compareVersions', () => {
  it('compara numero a numero, no como texto', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compareVersions('1.1', '1.1.0')).toBe(0);
    expect(compareVersions('1.1.1', '1.1.2')).toBeLessThan(0);
  });
});
