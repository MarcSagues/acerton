# Arquitectura del frontend

El objetivo es poder sustituir cualquier HTML/SCSS sin reimplementar reglas
de negocio, llamadas HTTP ni flujos de navegación. Se usa un DDD pragmático
por funcionalidad; no se replica la estructura del backend de forma literal.

## Capas por funcionalidad

```text
features/<contexto>/
  domain/          Reglas y tipos TypeScript puros
  application/     Casos de uso y estado de pantalla (fachadas)
  infrastructure/  Adaptadores HTTP, almacenamiento y APIs del dispositivo
  presentation/    Componentes, plantillas y estilos
```

Durante la migración se conserva la ubicación actual de los componentes para
no cambiar rutas ni imports dinámicos. Las fachadas se colocan junto a la
pantalla y el dominio compartido del contexto en `domain/`. Cuando todos los
flujos de un contexto estén migrados, se podrán mover físicamente a las
carpetas anteriores sin cambiar responsabilidades.

## Reglas de dependencia

1. `domain` no importa Angular, Router, Material, HttpClient, DOM ni servicios.
2. `application` coordina dominio e infraestructura y expone estado mediante
   signals, además de acciones con nombres de intención (`selectChoice`,
   `navigateNext`, etc.).
3. `presentation` inyecta una única fachada de pantalla. El HTML puede leer
   su estado y emitir acciones, pero no llama APIs, no calcula puntuaciones y
   no conoce formatos de transporte.
4. `infrastructure` implementa acceso HTTP, almacenamiento, portapapeles y
   otras APIs externas. Los servicios actuales de `core/services` cumplen
   temporalmente este papel y se irán ocultando detrás de puertos por contexto.
5. Las reglas de negocio extraídas se protegen con tests unitarios puros. Las
   fachadas se verifican con integraciones focalizadas y con datos locales.

## Patrón de pantalla

```ts
@Component({
  providers: [FeaturePageFacade],
  templateUrl: './feature-page.component.html',
  styleUrl: './feature-page.component.scss',
})
export class FeaturePageComponent {
  readonly page = inject(FeaturePageFacade);
}
```

La plantilla usa `page.estado()` y `page.accion()`. Así un rediseño puede
reemplazar por completo el componente visual o dividirlo en componentes
presentacionales sin mover la lógica de aplicación.

## Primera referencia

`current-matchday` es la primera migración vertical:

- `current-matchday.component.ts/html/scss`: presentación.
- `current-matchday.facade.ts`: carga, estado, guardado y navegación.
- `matchday/domain/prediction-rules.ts`: bloqueo, etiquetas, aciertos,
  puntuación y resumen, sin dependencias de Angular.

Las siguientes migraciones deben priorizar `group-detail`,
`matchday-results`, `rankings-page`, `group-list`, autenticación y perfil,
en ese orden, porque son las pantallas con más lógica acoplada a la vista.
