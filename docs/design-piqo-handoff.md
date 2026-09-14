# Handoff: rediseño "Piqo" (rama `design/nuevo-estilo-ui`)

Este documento es un traspaso de contexto para continuar este trabajo desde
otra herramienta (Codex u otra IA), sin acceso a la conversación original.
Léelo entero antes de tocar código: hay decisiones y una trampa de contraste
ya resueltas que son fáciles de repetir por error si no se conocen.

## Qué es esto y por qué existe

Acerton ("Quiniela") es una app de pronósticos deportivos en grupo (NestJS +
Prisma + PostgreSQL en `backend/`, Angular 18 + Material + PWA/Capacitor en
`frontend/`). El usuario pidió probar un rediseño visual completo basado en
un prototipo de Claude Design llamado **"Piqo"**, en una rama aislada para
poder tirarla sin más si no convence, o fusionarla si sí:

- Rama: `design/nuevo-estilo-ui`, creada desde `dev`, ya empujada a
  `origin/dev`... no, a `origin/design/nuevo-estilo-ui`. **No está
  fusionada a `dev` ni a `main`.**
- Origen del diseño: proyecto de Claude Design "Piqo: pronósticos
  deportivos" (id `546bf60f-4be8-4c97-b129-c591fb240b9d`), archivo
  `Piqo Prototipo.dc.html`, 18 pantallas mock con datos ficticios y lógica
  de navegación de prototipo (no es código reutilizable, solo referencia
  visual). Si hace falta volver a consultarlo y tienes acceso al MCP de
  Claude Design, la URL es
  `https://claude.ai/design/p/546bf60f-4be8-4c97-b129-c591fb240b9d?file=Piqo+Prototipo.dc.html`.
  Si no tienes ese acceso, todo lo relevante ya está volcado en este
  documento y en el código ya escrito — no deberías necesitar volver a él
  salvo para diseñar las pantallas del Lote 4 (ver más abajo).

**Instrucción original del usuario, textual (es la que manda sobre
cualquier interpretación mía):**

> "el color del header para el light mode... debe seguir las guidelines de
> colores, si no se tenía esto contemplado se debe buscar una opción
> mejor" — y, de la petición inicial: "aplica el estilo del prototipo pero
> adaptado al contenido real de la app; las pantallas del prototipo que no
> existen en la app se montan con datos mock; donde el prototipo no cubra
> opciones que la app real sí tiene, se integran con criterio, sin perder
> nada; alcance: toda la app." Rebranding completo a "Piqo" (nombre,
> vocabulario, logo "pq"). Paleta fija por ahora; el modo oscuro se pidió
> más adelante en la misma sesión y ya está implementado (ver abajo).

## Estado: qué está hecho (Lotes 0-5, todos cerrados)

18 commits de implementación en la rama, con los incrementos funcionales
verificados en navegador y con datos reales cuando la pantalla los requiere
(cuentas de prueba creadas y limpiadas después). Orden:

```
bc62782 Rediseño Piqo (lote 0+1 parcial): tokens, marca y pantallas nucleo
f4d01a6 Añade tema claro/oscuro a Piqo (mismos tokens, sin rediseño)
c7623dc Rediseño Piqo (cierre lote 1): cabecera oscura en Jornada y Clasificación
a36e182 Corrige contraste de --accent como texto/enlace + cabecera de Perfil
f48f784 Rediseño Piqo (cierre lote 2): pantalla de invitación dedicada
d54665a Rediseño Piqo (lote 3, parte 1): comparativa de todos en jornada cerrada
3807032 Cabeceras adaptables al tema (ya no siempre negras) + ajustes en Tabla
21befa0 Rediseño Piqo (lote 3, parte 2): calendario de jornadas
2445ac3 Rediseño Piqo (lote 3, parte 3): histórico de jornadas por grupo
310acfe Rediseño Piqo (lote 3, parte 4): detalle de miembro
ce9b720 Rediseño Piqo (lote 3, parte 5 — cierra el lote): gráfico de evolución
dad19f4 Rediseño Piqo (lote 4, parte 1): carrusel de onboarding
d945a27 Rediseño Piqo (lote 4, parte 2): confirmación real de jornada
2e7b458 Rediseño Piqo (lote 4, parte 3): bandeja de avisos mock
eeefa37 Rediseño Piqo (lote 4, parte 4): normas y premios
6d56733 Rediseño Piqo (lote 5, parte 1): completa el barrido de marca
b5abac1 Rediseño Piqo (lote 5, parte 2): centraliza colores de marca
d7fbd43 Rediseño Piqo (lote 5, parte 3): renueva iconos y marca nativa
```

Lee los mensajes de commit completos (`git log -p` o `git show <hash>`) si
necesitas el detalle de una decisión concreta — están escritos para
explicar el porqué, no solo el qué.

### Lo que ya funciona, pantalla a pantalla

| Pantalla real | Estado |
|---|---|
| Login/registro (`auth-page`) | Reskin completo, mismo flujo real (email+contraseña+Google) |
| Grupos (`group-list`) | Reskin con cabecera + tarjetas de grupo |
| Jornada (`current-matchday`, 1X2 y resultado exacto) | Reskin completo con cabecera; título "Liga · Jn" ahora abre el Calendario |
| Resultados de jornada (`matchday-results`) | Reskin + comparativa de todos los miembros + enlaces a Histórico y a "Ver perfil" del miembro |
| Clasificación (`rankings-page`) | Reskin + selector de liga dentro de la cabecera (solo si hay >1 liga) + gráfico de evolución en pestaña Total |
| Perfil (`profile-page`) | Reskin con cabecera + selector de tema Claro/Oscuro/Automático |
| Ajustes de grupo (`group-detail`) | Reskin conservando toda la funcionalidad (roles, transferencia, expulsión, borrado) |
| Invitar (`group-invite`, **nueva**) | Pantalla propia extraída de Ajustes, siempre oscura (ver regla de marca) |
| Calendario de jornadas (`matchday-calendar`, **nueva**) | Rejilla 4 columnas, jugada/abierta/próxima |
| Histórico de jornadas (`matchday-history`, **nueva**) | Lista de jornadas finalizadas con ganador y medias |
| Detalle de miembro (`member-detail`, **nueva**) | Racha, % aciertos, insignias, últimas jornadas de otro miembro del grupo |
| Onboarding pre-login (`landing-page`) | Carrusel de 3 pasos, siempre oscuro, con modos de puntuación reales |
| Confirmación "Enviado" (`current-matchday`) | Resumen de los pronósticos recién guardados + copia real al portapapeles |
| Avisos (`notifications`, **nueva**) | Bandeja visual con datos mock marcados explícitamente como demo; no hay backend persistido |
| Normas y premios (`rules-and-prizes`, **nueva**) | Reglas reales del grupo + bloque genérico de premios pactados fuera de la app |

### Endpoints de backend nuevos (todos de solo lectura, sin migración)

1. `GET groups/:groupId/competitions/:competitionId/matchdays` —
   `MatchdaysService.listForCompetitionWithUserPoints` — jornadas de una
   competición con los puntos del usuario en cada una (`null` si no
   pronosticó esa jornada, para distinguir de "jugó y sacó 0").
2. `GET groups/:groupId/rankings/history?competitionId=...` —
   `RankingsService.getHistoryForCompetition` — jornadas finalizadas de una
   competición con quién ganó y la media del grupo/usuario. Reutiliza los
   `RankingSnapshot` semanales ya calculados al cerrar cada jornada.
3. `GET groups/:groupId/members/:userId/profile` — módulo nuevo
   `backend/src/member-profile/` (`MemberProfileService`) — racha, % de
   aciertos, insignias del grupo y últimas 5 jornadas de un miembro
   concreto. Nuevo módulo registrado en `app.module.ts`.

Todos siguen el patrón ya usado en el repo: método en `*.service.ts` +
endpoint en `*.controller.ts` (comprobando `groupsService.assertIsMember`)
+ tests unitarios con `buildPrismaMock()` (mock de objeto plano por
modelo/método usado, servicio instanciado directo con
`new XService(prismaMock as never, ...)`, sin `TestingModule` de Nest).
**132/132 tests de backend pasan** tras estos cambios (`cd backend && npx
jest`).

## El sistema de temas (léelo antes de tocar cualquier color)

`frontend/src/styles.scss` es la única fuente de verdad de color. Define
dos "familias" de tokens:

**Tokens canónicos nuevos** (definidos por tema, vía mixins `light-tokens`
/ `dark-tokens`, aplicados a `:root` con un mecanismo de tres capas:
`:root` = claro por defecto; `@media (prefers-color-scheme: dark)` sobre
`:root:not([data-theme='light'])` = sigue el sistema si no hay preferencia
guardada; `:root[data-theme='dark']` / `:root[data-theme='light']` fuerzan
el tema si el usuario eligió uno explícito en Perfil):

```
--bg, --surface, --surface-2, --border-c, --divider-c,
--ink, --ink-muted, --ink-faint,
--accent-c, --accent-soft,
--inverse-surface, --on-inverse, --on-inverse-accent,
--champagne, --on-champagne,
--danger-c, --danger-bg-c, --danger-border-c
```

**Alias hacia los nombres "viejos"** (los que ya usan los ~700 sitios en
componentes existentes — **no los renombres en los componentes, cambia
solo los alias aquí si hace falta retocar algo globalmente**):

```
--surface-alt        → --surface-2
--surface-alt-2       → --accent-soft
--surface-dark        → --inverse-surface
--border               → --border-c
--border-strong        → --divider-c
--text-primary         → --ink
--text-secondary       → --ink-muted
--text-tertiary        → --ink-faint
--text-on-dark          → --on-inverse
--text-on-dark-secondary→ --on-inverse   (mismo valor, no hay variante "muted" de on-inverse)
--text-on-dark-tertiary → --on-inverse
--accent                → --champagne        (dorado #D2BE94, FIJO en los dos temas)
--accent-on             → --on-champagne     (#121619, FIJO)
--accent-bg             → --accent-soft
--accent-border         → --divider-c
--accent-secondary      → --accent-c          (bronce #786039 en claro / champán #D2BE94 en oscuro)
--danger / --danger-bg / --danger-border → --danger-c / --danger-bg-c / --danger-border-c
```

Valores exactos actuales (cópialos de `frontend/src/styles.scss`, no los
retipees a mano — esa es la fuente de verdad):

- **Claro**: bg `#F1F0EA`, surface `#FFFFFF`, surface-2
  `rgba(18,22,25,.06)`, ink `#121619`, accent-c (bronce) `#786039`,
  inverse-surface `#121619`.
- **Oscuro**: bg `#0B0E10`, surface `#15191C`, surface-2
  `rgba(241,240,234,.07)`, ink `#F1F0EA`, accent-c (champán) `#D2BE94`,
  inverse-surface `#1D2226` (más claro que el bg, para que se note como
  panel elevado sobre fondo ya oscuro).
- **Champán `#D2BE94` y `on-champagne #121619`**: fijos, iguales en los
  dos temas — es la firma de marca (chips, botón primario, insignias).

### ⚠️ La trampa de contraste ya encontrada y corregida — no la repitas

`--accent` (alias de `--champagne`) es un dorado **claro**, fijo en los dos
temas. Es perfecto como **relleno sólido** emparejado con `--accent-on`
(texto oscuro encima: botones, chips, insignias de acierto). Pero si lo
usas como **color de texto/icono/borde suelto sobre una superficie normal**
(`--surface` o `--bg`), en tema claro queda casi ilegible (dorado claro
sobre blanco/crema, ~1.6:1 de contraste). Esto pasó de verdad la primera
vez que se tokenizó todo el proyecto — hubo que auditar 28 sitios y
corregirlos.

**Regla a seguir en código nuevo:**
- ¿Vas a pintar un **relleno sólido** que YA lleva `--accent-on` como
  texto encima (botón primario, chip de estado, insignia)? → `--accent`
  está bien.
- ¿Vas a pintar **texto, un icono suelto, un borde, un enlace** sobre una
  superficie normal (`--surface`/`--bg`/`--surface-2`)? → usa
  `--accent-secondary` (bronce/champán según tema, siempre con contraste
  suficiente), nunca `--accent` a secas.
- ¿Es texto/icono sobre una superficie **siempre oscura** de verdad
  (`--surface-dark`/`--inverse-surface`, ver siguiente sección)? → ahí
  `--accent` (o `--on-inverse-accent`, mismo valor) sí es correcto.

### Cabeceras de pantalla vs. "siempre oscuro" — dos patrones distintos

Al principio todas las cabeceras de pantalla (Grupos, Jornada,
Clasificación, Perfil) usaban `--surface-dark` (negro-azulado fijo en los
dos temas), imitando literalmente los mock-ups oscuros de Piqo. El usuario
corrigió esto a mitad de sesión: en **tema claro** una cabecera
permanentemente negra no encajaba con el resto de la pantalla. La
corrección ya aplicada:

- **Cabeceras de pantalla normales** (bloque redondeado arriba de Grupos,
  Jornada, Clasificación, Perfil — clase `.dark-head` en cada componente,
  el nombre se quedó pero ya no es "oscura" de verdad) → usan
  `background: var(--surface-2); border-bottom: 1px solid var(--border);`
  y **texto con `--text-primary`/`--text-secondary`** (no
  `--text-on-dark`). Los círculos/avatares dentro de esa cabecera usan
  `var(--surface)` sólido para destacar sobre el `surface-2`. El
  `GroupSwitcherComponent` tiene un input `[onDark]="true"` para este
  contexto — el nombre es historico, en la práctica ahora aplica los
  mismos tokens de superficie normal (`--surface` para el avatar,
  `--text-primary`/`--text-secondary`/`--accent-secondary` para textos),
  no algo literalmente oscuro.
- **Pantallas de marca, permanentemente oscuras en los dos temas** (regla
  de marca, no tocar): la pantalla de **Invitar**
  (`group-invite.component`, toda la pantalla, no solo una cabecera) y el
  **boot-loader** estático de `frontend/src/index.html` (el `pq` que se ve
  antes de que cargue Angular). Estas SÍ usan `--surface-dark`/
  `--inverse-surface` y `--text-on-dark`/`--on-inverse-accent` a
  propósito. El **Onboarding** (`landing-page`) y la confirmación
  **Enviado** de Jornada también son siempre oscuros por la misma regla
  de marca.

Si añades una pantalla nueva y dudas cuál de los dos patrones usar:
¿es una pantalla de navegación normal, o un momento de marca/conversión
puntual (bienvenida, compartir, celebración)? Lo primero → `--surface-2`.
Lo segundo → `--surface-dark`.

## El selector de tema (Claro/Oscuro/Automático)

- Servicio: `frontend/src/app/core/services/theme.service.ts`
  (`ThemeService`). Guarda la preferencia en `localStorage` bajo la clave
  `piqo-theme` (`'light' | 'dark' | 'auto'`), aplica/quita el atributo
  `data-theme` en `<html>`, y mantiene sincronizado
  `<meta name="theme-color">` (incluso si el usuario está en "Automático"
  y cambia el tema del sistema en caliente, vía
  `matchMedia('(prefers-color-scheme: dark)')`).
- Se instancia forzosamente al arrancar inyectándolo (sin usarlo) en
  `AppComponent` — si no, al ser `providedIn: 'root'` con instanciación
  perezosa, no se aplicaría hasta que algo más lo pidiera.
- `frontend/src/index.html` tiene un script inline (antes de que cargue
  Angular) que lee `localStorage.getItem('piqo-theme')` y pone
  `data-theme` en `<html>` de inmediato, para evitar parpadeo del tema
  incorrecto mientras carga el bundle.
- UI: selector de 3 botones en Perfil → Ajustes → Apariencia
  (`profile-page.component.html/.ts`), mismo patrón visual de segmented
  control que el resto de tabs de la app.

## Rebranding a "Piqo" — estado final

El barrido visible ya está completo: título web, manifest, boot-loader,
login, tutorial, soporte, privacidad, aviso de juego sin dinero, nombres
nativos de Android/iOS y títulos fallback de notificaciones muestran
Piqo. `Quiniela 1X2`, `tus quinielas` y expresiones equivalentes se
mantienen cuando nombran el modo de juego o los pronósticos; no son marca
antigua en esos contextos.

Los identificadores técnicos existentes tampoco se renombran: dominio
`acerton.app`, correo `support@acerton.app`, Firebase, `appId`/bundle id,
namespace Java y claves antiguas de `localStorage`. Cambiarlos rompería
infraestructura, sesiones o preferencias ya guardadas y no aporta ningún
cambio visual.

Los iconos web/PWA, favicon, App Store/iOS y Android, incluidos los splash,
ya usan el monograma `pq` en grafito y champán. Las pantallas de arranque
nativas son siempre oscuras, igual que el boot-loader y el onboarding.

## Reglas de producto que no se pueden inventar ni saltar

Estas vienen de `docs/quiniela/product-rules.md` (la fuente normativa del
roadmap real de la app, independiente de este rediseño) y de decisiones
tomadas durante esta sesión — no las contradigas al construir pantallas
nuevas:

- El comodín "×2 manual por partido" que aparece en el mock de Piqo
  **no existe** en la app real. Los mecanismos reales son: **doble
  oportunidad** (elegir 2 signos en vez de 1, ya implementado) y
  **comodín de remontada** (automático según diferencia de puntos con el
  líder, no es una elección manual del usuario partido a partido). No
  añadas un botón "×2" manual nuevo — ya se resolvió reutilizando el hueco
  visual de Piqo para la doble oportunidad real.
- El login es **email+contraseña real + Google**, no "enlace mágico" sin
  contraseña como sugiere el mock de Piqo. Ya adaptado.
- Elegibilidad de premios, temporadas, insignias, etc. tienen sus propias
  reglas ya implementadas en sprints anteriores (fuera de esta rama de
  diseño) — no las reinventes, solo reskinéalas si tocas esas pantallas.

## Cómo verificar en local (Windows)

- Postgres: Docker, contenedor `acerton-postgres-1`, puerto 5433.
- Backend: desde la raíz del repo, `npm run dev:backend` (NO
  `npm run dev` dentro de `backend/`, ese script no existe — solo
  `start:dev`). Escucha en `http://localhost:3000/api`.
- Frontend: `cd frontend && npm start`, sirve en `http://localhost:4200`.
- **Problema conocido en Windows**: `npx prisma generate` falla con
  `EPERM` si `nest start --watch` tiene el DLL del motor de Prisma
  abierto. Solución: matar los procesos `node.exe` cuyo `CommandLine`
  contenga `nest.js` o `dist.src.main` (`Get-CimInstance Win32_Process
  -Filter "Name='node.exe'"` + `taskkill //PID <id> //F`), regenerar, y
  reiniciar el backend.
- Backend: `cd backend && npx jest` (todo) o `npx jest src/<carpeta>`
  (un módulo). `npx tsc --noEmit` para comprobar tipos.
- **Verificación con datos reales, no solo capturas**: en esta sesión,
  cada pantalla nueva/tocada se comprobó registrando una cuenta de prueba
  vía `POST /api/auth/register` (email tipo
  `qa-piqo-<random>@test.local`), uniéndola al grupo público real "test"
  (id `cmtvg631b005lcrw76prjprzx` en la BBDD local, código de invitación
  `CFC8TZXR`), y cuando hacía falta una jornada finalizada con puntos, se
  insertaron filas de `predictions`/`ranking_snapshots`/`streaks`
  directamente por SQL — **siempre dentro de una transacción explícita
  con `BEGIN; ... COMMIT;` y por ID exacto (nunca un `DELETE` con filtro
  ambiguo sin transacción)**, y **siempre limpiadas después** en la misma
  sesión. Regla de seguridad no negociable de este repo: nunca un
  `DELETE`/`UPDATE` masivo por patrón contra la BBDD local sin previsualizar
  antes con `SELECT` y sin envolverlo en una transacción — ya hubo un
  incidente real de borrado accidental de datos reales del usuario antes
  de esta sesión. El usuario real de prueba llamado `sagui` en esa BBDD es
  una cuenta real suya, no una cuenta de QA — nunca insertes/borres datos
  atribuidos a ese usuario.
- Un usuario real del propio dueño del repo (`marc@sagues.cat` /
  `marc@sagues.cat`-equivalente en el navegador) tiene credenciales
  autocompletadas por Chrome en el formulario de login — si automatizas
  el navegador, ten cuidado de sobrescribir el campo con la cuenta de QA
  antes de enviar el formulario (el autocompletado tiende a reponerse
  tras cada recarga de página del `ng serve` en modo watch).

## Lotes 4 y 5 — cerrados

- El onboarding tiene tres pasos y usa una superficie de marca siempre
  oscura. Explica los dos modos de puntuación existentes, sin añadir
  mecánicas ficticias.
- Al guardar una jornada se muestra `Enviado` con el resumen exacto de las
  selecciones que devolvió el backend. `Copiar resumen` usa el portapapeles
  real. Justo debajo aparece **Compartir imagen**, que abre un canvas real
  de 1080×1080 con los pronósticos; la vista cerrada de resultados conserva
  otra entrada para compartir el resultado final. No son botones ficticios.
- Avisos deja escrito en código y en pantalla que sus datos son una demo.
  No se creó persistencia de notificaciones.
- Normas y premios consume grupo/competición reales para mostrar el modo de
  puntuación y el comodín de remontada. Los premios se describen como un
  acuerdo externo del grupo porque no existe ese dato en el modelo.
- El barrido de color movió transparencias y sombras de componentes a
  tokens compartidos en `styles.scss`. Los únicos hex/RGBA que quedan fuera
  son el loader estático de `index.html` y `ThemeService`, que necesitan
  colores exactos antes o fuera de la cascada CSS.
- Los iconos instalables y recursos nativos ya muestran Piqo.

Verificación del cierre: build Angular de producción correcto y recursos
PWA comprobados desde `http://localhost:4200`. Los PNG tienen los tamaños
declarados y los XML/plist nativos son válidos. El ensamblado Android no
pudo completarse en esta máquina: Gradle toma Java 8 por defecto y el JBR
instalado con Android Studio es Java 11, mientras el Android Gradle Plugin
8.13 exige Java 17. Es una limitación del entorno, no un error de recursos;
repetir `gradlew.bat assembleDebug` con `JAVA_HOME` apuntando a un JDK 17.

La verificación funcional del Lote 4 se hizo con backend NestJS, frontend
Angular y PostgreSQL locales: cuenta QA y grupo exacto creados dentro de
transacciones, comprobación de la confirmación con pronósticos reales y
limpieza final verificada (`0|0`). No se tocó el usuario `sagui`.

## Cómo seguir sin repetir trabajo

1. `git checkout design/nuevo-estilo-ui && git pull` (o clona el repo y
   haz checkout de esa rama si trabajas desde cero).
2. Lee los commits (`git log --oneline dev..design/nuevo-estilo-ui`) si
   quieres el detalle exacto de cada decisión, especialmente
   `a36e182` (la corrección de contraste) y `3807032` (la corrección de
   cabeceras) — son los dos sitios donde más se aprendió a base de
   errores ya corregidos, no los repitas.
3. Si se añade otro lote, mantén un incremento por commit y verifica con
   datos reales las pantallas que dependen del backend.
4. Todo se commitea directamente a `design/nuevo-estilo-ui` y se empuja a
   `origin/design/nuevo-estilo-ui`. **No mergees a `dev` ni a `main`** sin
   que el usuario lo pida explícitamente — es una rama de prueba que él
   decidirá si integrar o descartar.
