// Comprueba que la entrada de arriba del historial de versiones de la app
// (frontend/src/app/core/changelog/changelog.ts) tiene la misma version que
// MARKETING_VERSION del proyecto iOS. El pop-up de novedades solo sale cuando
// la version instalada coincide con una entrada del historial, asi que si se
// sube de version en uno y se olvida el otro, el aviso deja de salir sin
// ningun error. Se ejecuta en CI (ver .github/workflows/ci.yml); a mano:
//   node scripts/check-changelog.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const changelogFile = path.join(root, 'frontend/src/app/core/changelog/changelog.ts');
const pbxprojFile = path.join(root, 'frontend/ios/App/App.xcodeproj/project.pbxproj');

const fail = (message) => {
  console.error(`check-changelog: ${message}`);
  process.exit(1);
};

const changelog = fs.readFileSync(changelogFile, 'utf8');
const versions = [...changelog.matchAll(/^\s{4}version: '([^']+)',$/gm)].map((match) => match[1]);
if (versions.length === 0) fail(`no encuentro ninguna entrada \`version: '...'\` en ${path.relative(root, changelogFile)}`);

const marketing = [...new Set([...fs.readFileSync(pbxprojFile, 'utf8').matchAll(/MARKETING_VERSION = ([^;\s]+);/g)].map((match) => match[1]))];
if (marketing.length !== 1) {
  fail(`MARKETING_VERSION tiene ${marketing.length} valores distintos en el .pbxproj (${marketing.join(', ') || 'ninguno'}); tiene que ser uno solo`);
}

if (versions[0] !== marketing[0]) {
  fail(
    `la entrada de arriba del historial es ${versions[0]} pero MARKETING_VERSION del proyecto iOS es ${marketing[0]}. ` +
      'Al subir de version hay que cambiar las dos: anade la entrada nueva ARRIBA en changelog.ts y pon la misma version en el .pbxproj.',
  );
}

console.log(`check-changelog: ok (version ${versions[0]}, ${versions.length} entrada${versions.length === 1 ? '' : 's'} en el historial)`);
