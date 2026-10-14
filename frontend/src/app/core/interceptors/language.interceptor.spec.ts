import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { setLanguageForTests } from '../i18n/translate';
import { languageInterceptor } from './language.interceptor';

describe('languageInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([languageInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    setLanguageForTests('es');
    controller.verify();
  });

  it('manda el idioma de la app a nuestra API', () => {
    setLanguageForTests('en');
    http.get(`${environment.apiUrl}/groups/mine`).subscribe();
    expect(controller.expectOne(`${environment.apiUrl}/groups/mine`).request.headers.get('Accept-Language')).toBe('en');

    setLanguageForTests('es');
    http.get(`${environment.apiUrl}/groups/mine`).subscribe();
    expect(controller.expectOne(`${environment.apiUrl}/groups/mine`).request.headers.get('Accept-Language')).toBe('es');
  });

  it('no lo manda a otros servidores', () => {
    http.get('https://example.com/data.json').subscribe();
    expect(controller.expectOne('https://example.com/data.json').request.headers.has('Accept-Language')).toBe(false);
  });
});
