import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { overview } from '../../features/quiz/testing/quiz.fixtures';
import { QuizService } from './quiz.service';

const OVERVIEW_URL = `${environment.apiUrl}/quiz/overview`;

describe('QuizService.getOverview', () => {
  let http: HttpTestingController;
  let service: QuizService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(QuizService);
  });

  afterEach(() => http.verify());

  it('dos peticiones a la vez (la pantalla y la barra inferior) comparten una sola llamada al servidor', () => {
    const results: unknown[] = [];
    service.getOverview().subscribe((value) => results.push(value));
    service.getOverview().subscribe((value) => results.push(value));

    const request = http.expectOne(OVERVIEW_URL);
    const body = overview();
    request.flush(body);

    expect(results).toEqual([body, body]);
    expect(service.lastOverview()).toEqual(body);
  });

  it('cuando termina, la siguiente peticion vuelve a ir al servidor', () => {
    service.getOverview().subscribe();
    http.expectOne(OVERVIEW_URL).flush(overview());

    service.getOverview().subscribe();

    http.expectOne(OVERVIEW_URL).flush(overview());
  });

  it('si falla, el siguiente intento no se queda enganchado a la peticion fallida', () => {
    service.getOverview().subscribe({ error: () => undefined });
    http.expectOne(OVERVIEW_URL).flush('x', { status: 500, statusText: 'Server Error' });

    service.getOverview().subscribe();

    http.expectOne(OVERVIEW_URL).flush(overview());
  });
});
