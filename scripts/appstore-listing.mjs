#!/usr/bin/env node
/**
 * Deja la ficha de la App Store lista en App Store Connect a partir de docs/app-store/ficha-<version>.md:
 * crea o renombra la version, pone nombre y subtitulo de cada idioma (los que ve cada dispositivo segun su
 * idioma), descripcion, palabras clave, texto promocional y novedades, y asocia la compilacion subida por el
 * flujo de iOS. NO la envia a revision: ese ultimo paso lo das tu en App Store Connect.
 *
 * Variables: APPSTORE_API_KEY_ID, APPSTORE_API_ISSUER_ID, APPSTORE_API_KEY_P8 (contenido de la clave .p8).
 * Argumentos: --version=1.1.0  [--build=<numero de compilacion>]  [--wait-build=<minutos>]  [--dry-run]
 */
import crypto from 'node:crypto';
import fs from 'node:fs';

const arg = (name, fallback = '') => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) || fallback;
const VERSION = arg('version', '1.1.0');
const BUILD = arg('build');
const WAIT_MIN = Number(arg('wait-build', '0'));
const DRY = process.argv.includes('--dry-run');
const BUNDLE_ID = 'app.piqo.es';
/** Politica de privacidad (la misma pagina de la app, traducida a los seis idiomas): Apple exige la URL para enviar a revision. */
const PRIVACY_URL = 'https://app.piqo.es/privacy';
const API = 'https://api.appstoreconnect.apple.com';

/** Codigo del idioma en la ficha -> codigo de App Store Connect. */
const LOCALES = { es: 'es-ES', 'en-GB': 'en-GB', 'en-US': 'en-US', ca: 'ca', fr: 'fr-FR', it: 'it', de: 'de-DE' };
const EDITABLE = ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY'];

const problems = [];
const log = (msg) => console.log(msg);

function token() {
  const b64 = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'ES256', kid: process.env.APPSTORE_API_KEY_ID, typ: 'JWT' });
  const body = b64({ iss: process.env.APPSTORE_API_ISSUER_ID, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' });
  const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key: process.env.APPSTORE_API_KEY_P8, dsaEncoding: 'ieee-p1363' });
  return `${head}.${body}.${sig.toString('base64url')}`;
}

async function api(method, path, body) {
  const res = await fetch(path.startsWith('http') ? path : API + path, {
    method,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const detail = (json.errors ?? []).map((e) => `${e.title}: ${e.detail}`).join(' | ') || text;
    throw new Error(`${method} ${path} -> ${res.status} ${detail}`);
  }
  return json;
}

/** Lo que cambia algo en App Store Connect: en --dry-run solo se cuenta lo que se haria. */
async function write(method, path, body, what) {
  if (DRY) {
    log(`  [dry-run] ${what}`);
    return { data: { id: 'dry-run' } };
  }
  const res = await api(method, path, body);
  log(`  ok: ${what}`);
  return res;
}

/** Lee docs/app-store/ficha-<version>.md: por idioma, nombre, subtitulo, palabras clave, promo, descripcion y novedades. */
function readFicha() {
  const md = fs.readFileSync(`docs/app-store/ficha-${VERSION}.md`, 'utf8').replace(/\r\n/g, '\n');
  const fields = { Nombre: 'name', 'Subtítulo': 'subtitle', 'Palabras clave': 'keywords', 'Texto promocional': 'promotionalText', 'Descripción': 'description', Novedades: 'whatsNew' };
  const result = {};
  for (const section of md.split(/\n(?=## .*\(`[a-zA-Z-]+`\))/)) {
    const code = section.match(/^## .*\(`([a-zA-Z-]+)`\)/)?.[1];
    if (!code || !LOCALES[code]) continue;
    const texts = {};
    for (const m of section.matchAll(/\*\*([^*(]+?) \(máx\. \d+\)\*\*[^\n]*\n\n```\n([\s\S]*?)\n```/g)) {
      const key = Object.entries(fields).find(([label]) => m[1].startsWith(label))?.[1];
      if (key) texts[key] = m[2];
    }
    for (const key of Object.values(fields)) if (!texts[key]) throw new Error(`Falta ${key} en ${code} de la ficha`);
    result[LOCALES[code]] = texts;
  }
  if (!Object.keys(result).length) throw new Error('No se ha leido ningun idioma de la ficha');
  return result;
}

const attempt = async (what, fn) => {
  try {
    await fn();
  } catch (e) {
    problems.push(`${what}: ${e.message}`);
    log(`  ERROR ${what}: ${e.message}`);
  }
};

async function ensureVersion(appId) {
  const { data: versions } = await api('GET', `/v1/apps/${appId}/appStoreVersions?filter[platform]=IOS&limit=20`);
  const state = (v) => v.attributes.appStoreState ?? v.attributes.appVersionState;
  log(`Versiones: ${versions.map((v) => `${v.attributes.versionString} (${state(v)})`).join(', ') || 'ninguna'}`);
  const same = versions.find((v) => v.attributes.versionString === VERSION);
  if (same) {
    if (!EDITABLE.includes(state(same))) throw new Error(`La version ${VERSION} esta en ${state(same)}: ya no se puede editar`);
    return same.id;
  }
  const editable = versions.find((v) => EDITABLE.includes(state(v)));
  if (editable) {
    log(`Renombrando ${editable.attributes.versionString} -> ${VERSION}`);
    await write('PATCH', `/v1/appStoreVersions/${editable.id}`, { data: { type: 'appStoreVersions', id: editable.id, attributes: { versionString: VERSION } } }, `version ${editable.attributes.versionString} -> ${VERSION}`);
    return editable.id;
  }
  log(`Creando la version ${VERSION}`);
  const created = await write('POST', '/v1/appStoreVersions', { data: { type: 'appStoreVersions', attributes: { platform: 'IOS', versionString: VERSION }, relationships: { app: { data: { type: 'apps', id: appId } } } } }, `crear version ${VERSION}`);
  return created.data.id;
}

async function appInfoLocalizations(appId, ficha) {
  const { data: infos } = await api('GET', `/v1/apps/${appId}/appInfos`);
  const state = (i) => i.attributes.appStoreState ?? i.attributes.state;
  const info = infos.find((i) => EDITABLE.includes(state(i))) ?? (infos.length === 1 ? infos[0] : null);
  if (!info) throw new Error(`Sin appInfo editable (${infos.map(state).join(', ')}): crea antes la version en App Store Connect`);
  const { data: existing } = await api('GET', `/v1/appInfos/${info.id}/appInfoLocalizations?limit=50`);
  for (const [locale, t] of Object.entries(ficha)) {
    await attempt(`nombre/subtitulo ${locale}`, async () => {
      const current = existing.find((l) => l.attributes.locale === locale);
      const attributes = { name: t.name, subtitle: t.subtitle, privacyPolicyUrl: PRIVACY_URL };
      if (current) {
        const a = current.attributes;
        if (a.name === t.name && a.subtitle === t.subtitle && a.privacyPolicyUrl === PRIVACY_URL) return log(`  = ${locale}: nombre, subtitulo y politica de privacidad ya estan`);
        await write('PATCH', `/v1/appInfoLocalizations/${current.id}`, { data: { type: 'appInfoLocalizations', id: current.id, attributes } }, `${locale}: "${t.name}" / "${t.subtitle}" + privacidad`);
      } else {
        await write('POST', '/v1/appInfoLocalizations', { data: { type: 'appInfoLocalizations', attributes: { locale, ...attributes }, relationships: { appInfo: { data: { type: 'appInfos', id: info.id } } } } }, `${locale} (nuevo): "${t.name}" / "${t.subtitle}"`);
      }
    });
  }
  // Idiomas que Apple pide aunque no tengan ficha propia (p. ej. francés de Canadá o español de México): también
  // necesitan la URL de privacidad para poder enviar a revisión.
  for (const l of existing.filter((l) => !ficha[l.attributes.locale] && l.attributes.privacyPolicyUrl !== PRIVACY_URL)) {
    await attempt(`privacidad ${l.attributes.locale}`, () =>
      write('PATCH', `/v1/appInfoLocalizations/${l.id}`, { data: { type: 'appInfoLocalizations', id: l.id, attributes: { privacyPolicyUrl: PRIVACY_URL } } }, `${l.attributes.locale}: politica de privacidad`),
    );
  }
}

async function versionLocalizations(versionId, ficha) {
  const { data: existing } = await api('GET', `/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations?limit=50`);
  const base = existing.find((l) => l.attributes.locale === 'es-ES') ?? existing[0];
  for (const [locale, t] of Object.entries(ficha)) {
    await attempt(`textos ${locale}`, async () => {
      const attributes = { description: t.description, keywords: t.keywords, promotionalText: t.promotionalText, whatsNew: t.whatsNew };
      const current = existing.find((l) => l.attributes.locale === locale);
      if (current) {
        await write('PATCH', `/v1/appStoreVersionLocalizations/${current.id}`, { data: { type: 'appStoreVersionLocalizations', id: current.id, attributes } }, `${locale}: descripcion, palabras clave, promo y novedades`);
      } else {
        // Las URLs de soporte y marketing son las mismas que las del idioma principal.
        const urls = { supportUrl: base?.attributes.supportUrl, marketingUrl: base?.attributes.marketingUrl };
        for (const k of Object.keys(urls)) if (!urls[k]) delete urls[k];
        await write('POST', '/v1/appStoreVersionLocalizations', { data: { type: 'appStoreVersionLocalizations', attributes: { locale, ...attributes, ...urls }, relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } } } } }, `${locale} (nuevo): textos de la version`);
      }
    });
  }
}

async function attachBuild(appId, versionId) {
  const deadline = Date.now() + WAIT_MIN * 60_000;
  for (;;) {
    const { data: builds } = await api('GET', `/v1/builds?filter[app]=${appId}&filter[preReleaseVersion.version]=${VERSION}&sort=-uploadedDate&limit=20`);
    const wanted = builds.filter((b) => !b.attributes.expired && (!BUILD || b.attributes.version === BUILD));
    const ready = wanted.find((b) => b.attributes.processingState === 'VALID');
    if (ready) {
      await write('PATCH', `/v1/appStoreVersions/${versionId}/relationships/build`, { data: { type: 'builds', id: ready.id } }, `compilacion ${VERSION} (${ready.attributes.version})`);
      return;
    }
    const seen = wanted.map((b) => `${b.attributes.version}:${b.attributes.processingState}`).join(', ') || 'ninguna';
    if (Date.now() >= deadline) throw new Error(`Compilacion ${VERSION}${BUILD ? ` (${BUILD})` : ''} no lista (${seen}). Vuelve a lanzar el flujo cuando Apple la termine de procesar`);
    log(`  esperando a que Apple procese la compilacion (${seen})...`);
    await new Promise((r) => setTimeout(r, 60_000));
  }
}

const ficha = readFicha();
log(`Ficha ${VERSION}: ${Object.keys(ficha).join(', ')}${DRY ? '  (dry-run: no se cambia nada)' : ''}`);
const { data: apps } = await api('GET', `/v1/apps?filter[bundleId]=${BUNDLE_ID}`);
if (!apps.length) throw new Error(`No hay app ${BUNDLE_ID}`);
const appId = apps[0].id;
const versionId = await ensureVersion(appId);
log('Nombre, subtitulo y politica de privacidad por idioma:');
await attempt('appInfo', () => appInfoLocalizations(appId, ficha));
log('Textos de la version por idioma:');
await attempt('textos de la version', () => versionLocalizations(versionId, ficha));
log('Compilacion:');
await attempt('compilacion', () => attachBuild(appId, versionId));

if (problems.length) {
  console.error(`\n${problems.length} problema(s):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
log('\nListo. Revisa App Store Connect y pulsa "Añadir para revisión" cuando quieras enviarla.');
