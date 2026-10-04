import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { translateErrorMessage } from './error-messages';
import { resolveLocale } from './locale';

const SRC = path.resolve(__dirname, '../..');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') ? [full] : [];
  });
}

/** Mensajes en espanol de `new XxxException('...')` y de `{ message: '...' }` en los DTO, tal como estan escritos en el codigo. */
function userFacingMessages(): Array<{ file: string; message: string }> {
  const found: Array<{ file: string; message: string }> = [];
  for (const file of sourceFiles(SRC)) {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const add = (node: ts.Node | undefined): void => {
      if (node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) {
        found.push({ file: path.relative(SRC, file), message: node.text });
      }
    };
    const visit = (node: ts.Node): void => {
      if (ts.isNewExpression(node) && /Exception$/.test(node.expression.getText()))
        add(node.arguments?.[0]);
      if (
        ts.isPropertyAssignment(node) &&
        node.name.getText() === 'message' &&
        file.includes(`${path.sep}dto${path.sep}`)
      ) {
        add(node.initializer);
      }
      if (ts.isVariableDeclaration(node) && node.name.getText().endsWith('_MESSAGE'))
        add(node.initializer);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return found;
}

describe('translateErrorMessage', () => {
  const messages = userFacingMessages();

  it('encuentra los mensajes del codigo (si no, este test no comprobaria nada)', () => {
    expect(messages.length).toBeGreaterThan(80);
  });

  it('cada mensaje de error del codigo tiene su traduccion al ingles', () => {
    const untranslated = messages.filter(
      ({ message }) => translateErrorMessage(message, 'en') === message,
    );
    expect(untranslated).toEqual([]);
  });

  it('en espanol devuelve el mensaje original', () => {
    for (const { message } of messages) expect(translateErrorMessage(message, 'es')).toBe(message);
  });

  it('traduce los mensajes con datos conservando los datos', () => {
    expect(
      translateErrorMessage(
        'Solo puedes cambiar el nombre una vez por semana. Podras hacerlo de nuevo el 11/10/2026.',
        'en',
      ),
    ).toBe('You can only change your name once a week. You can do it again on 11/10/2026.');
    expect(translateErrorMessage('Necesitas el nivel 7 para usar esta mascota.', 'en')).toBe(
      'You need level 7 to use this mascot.',
    );
    expect(translateErrorMessage('Necesitas el nivel 3 para usar este color.', 'en')).toBe(
      'You need level 3 to use this color.',
    );
  });

  it('un mensaje desconocido (por ejemplo los de validacion en ingles) se deja como esta', () => {
    expect(translateErrorMessage('email must be an email', 'en')).toBe('email must be an email');
  });
});

describe('resolveLocale', () => {
  it('ingles solo si el primer idioma es ingles', () => {
    expect(resolveLocale('en')).toBe('en');
    expect(resolveLocale('en-GB,en;q=0.9,es;q=0.8')).toBe('en');
    expect(resolveLocale('EN-us')).toBe('en');
    expect(resolveLocale('es-ES,es;q=0.9,en;q=0.8')).toBe('es');
    expect(resolveLocale('ca-ES')).toBe('es');
    expect(resolveLocale('fr')).toBe('es');
  });

  it('sin cabecera, o con una cabecera rara, se queda en espanol', () => {
    expect(resolveLocale(undefined)).toBe('es');
    expect(resolveLocale('')).toBe('es');
    expect(resolveLocale('*')).toBe('es');
    expect(resolveLocale(['en-US', 'es'])).toBe('en');
  });
});
