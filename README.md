# Mi Portfolio (Angular)

Portafolio personal desarrollado con Angular. Demostración pública:

- URL: https://alonsovine.github.io/portfolio/

## Tecnologías y stack

- Angular 16 (TypeScript)
- Bootstrap 5 + SCSS
- Font Awesome
- GitHub Actions + GitHub Pages para despliegue

## Requisitos locales

- Node.js LTS (>= 16)
- Angular CLI instalado globalmente: `npm i -g @angular/cli`

## Scripts útiles

- `npm start` → levanta el servidor de desarrollo en `http://localhost:4200/`
- `npm run build` → compila en modo producción (por configuración del proyecto)
- `npm test` → ejecuta tests

Nota: en Angular 16 `ng build` ya compila en producción por defecto en este proyecto. Si quieres ser explícito: `ng build --configuration production`.

## Estructura rápida

- `src/app/app.component.html` → compone las secciones: header, perfil, habilidades, experiencia, proyectos, certificados, contacto y footer.
- `src/app/app-routing.module.ts` → sin rutas (SPA por secciones en una sola página).
- `angular.json` → salida de build en `dist/portfolio` y estilos/scripts globales.

## Despliegue (GitHub Pages)

El despliegue está automatizado mediante un workflow de GitHub Actions: `.github/workflows/deploy.yml`.

- Publica el contenido generado en la rama `gh-pages`.
- Para que se ejecute automáticamente, el mensaje del último commit debe contener `deploy:` y el push debe ir a `main`.
- También se puede lanzar manualmente desde la pestaña Actions (`workflow_dispatch`).

### Cómo desplegar

1) Asegúrate de tener cambios comprometidos en `main` y crea un commit con `deploy:` en el mensaje. Ejemplo:

```
git add .
git commit -m "deploy: actualiza estilos del header"
git push origin main
```

2) Verifica el workflow en GitHub → pestaña `Actions` → workflow “Deploy to GitHub Pages”.

3) La web se publica/actualiza en `https://alonsovine.github.io/portfolio/` (GitHub Pages sirviendo la rama `gh-pages`).

### Build local de producción

Para compilar localmente en producción:

```
npm run build
```

El resultado queda en `dist/portfolio`. Para GitHub Pages el workflow añade `--base-href=/portfolio/` al comando de build, necesario para que las rutas funcionen correctamente bajo `/portfolio/`.

## Explicación del workflow (`deploy.yml`)

Archivo: `.github/workflows/deploy.yml`

- Triggers (`on`):
  - `push` a `main` (ignora cambios en `README.md`).
  - `workflow_dispatch` para ejecución manual.
- Condición de job:
  - `if: contains(github.event.head_commit.message, 'deploy:')` → solo despliega si el último commit del push contiene `deploy:`.
- Pasos principales:
  - `actions/checkout@v3` con `fetch-depth: 0` para disponer de historial completo.
  - `actions/setup-node@v3` con Node 16 y caché npm.
  - `npm ci` para instalar dependencias con `package-lock.json` (más reproducible en CI).
  - `npm run build -- --output-path=dist/portfolio --base-href=/portfolio/` para compilar Angular con el `base-href` apropiado de GitHub Pages.
  - Crear `.nojekyll` para deshabilitar Jekyll y evitar problemas sirviendo archivos.
  - `peaceiris/actions-gh-pages@v3` publica `./dist/portfolio` en `gh-pages`.

## Notas

- Si prefieres no depender del prefijo `deploy:` en el commit, se puede quitar la condición y el workflow se ejecutará en cada push a `main`.
- Se puede endurecer la convención de commits añadiendo `commitlint + husky` para validar mensajes (opcional).
