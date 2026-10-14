import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ScrollTopService } from './scroll-top.service';

@Component({ standalone: true, template: '' })
class BlankComponent {}

describe('ScrollTopService', () => {
  let router: Router;
  let scrollSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'a', component: BlankComponent },
          { path: 'b', component: BlankComponent },
        ]),
      ],
    });
    router = TestBed.inject(Router);
    scrollSpy = spyOn(document.body, 'scrollTo');
    TestBed.inject(ScrollTopService).init();
  });

  it('sube el scroll al cambiar de ruta', async () => {
    await router.navigateByUrl('/a');
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    await router.navigateByUrl('/b');
    expect(scrollSpy).toHaveBeenCalledTimes(2);
    expect(scrollSpy.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ top: 0 }));
  });

  it('no sube si solo cambian los parametros de la URL', async () => {
    await router.navigateByUrl('/a');
    scrollSpy.calls.reset();
    await router.navigateByUrl('/a?x=1');
    await router.navigateByUrl('/a?x=2#abajo');
    expect(scrollSpy).not.toHaveBeenCalled();
  });
});
