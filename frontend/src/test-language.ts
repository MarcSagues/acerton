// Los tests se escriben contra los textos en espanol (el idioma original): se fija
// antes de que se cargue ningun modulo de la app, porque el idioma se decide al
// importar core/i18n/translate (el navegador headless de los tests esta en ingles).
try {
  localStorage.setItem('acerton.lang', 'es');
} catch {
  /* sin storage: se usara el idioma del navegador */
}

