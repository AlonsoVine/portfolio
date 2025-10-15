# 🚀 Mi Portfolio (Angular)

¡Hola! Este es mi portafolio personal desarrollado con Angular. Aquí muestro quién soy, mi experiencia, mis habilidades y algunos proyectos que me divierte construir. La versión en producción está desplegada en GitHub Pages:

- URL pública: https://alonsovine.github.io/portfolio/

---

## 🧰 Tecnologías y stack

- Angular 16 (TypeScript)
- Bootstrap 5 + SCSS para estilos
- Font Awesome para iconografía
- GitHub Actions + GitHub Pages para despliegue continuo

---

## 🧑‍💻 Requisitos locales

- Node.js LTS (>= 16)
- Angular CLI global: `npm i -g @angular/cli`

Primera vez en el proyecto:

```
npm ci
npm start
```

Esto levanta la app en `http://localhost:4200/` con recarga en caliente.

---

## 📦 Scripts útiles

- `npm start` → inicia el servidor de desarrollo
- `npm run build` → compila en modo producción (por configuración del proyecto)
- `npm test` → ejecuta tests

Nota rápida: en Angular 16 este proyecto ya tiene `defaultConfiguration: production`, así que `ng build` compila en prod por defecto. Si quiero ser explícito, uso `ng build --configuration production`.

---

## 🗂️ Estructura del proyecto (resumen)

- `src/app/app.component.html` → compone todas las secciones de la landing: `header`, `perfil`, `habilidades`, `experiencia`, `proyectos`, `certificados`, `contacto`, `footer`.
- `src/app/app-routing.module.ts` → no defino rutas (es una SPA de una sola página con secciones).
- `angular.json` → salida de compilación en `dist/portfolio`, y configuración de estilos/scripts globales (Bootstrap, Font Awesome, jQuery para algunos componentes de Bootstrap).
- `src/assets/` → imágenes, certificados y recursos estáticos.

Decisiones de UI/UX: estructura sencilla tipo landing con secciones claras y scroll. Bootstrap me da velocidad para maquetar y mantener responsive sin fricción.

---

## 🚢 Despliegue a producción (GitHub Pages)

Tengo automatizado el despliegue con GitHub Actions (`.github/workflows/deploy.yml`). El flujo es simple y predecible: si el último commit del push a `main` contiene `deploy:`, se construye y publica automáticamente a la rama `gh-pages`.

### ✅ Cómo publico

1) Confirmo que estoy en `main` y sincronizado:

```
git checkout main
git pull
```

2) Hago commit de mis cambios usando el prefijo `deploy:` en el mensaje (esto dispara el pipeline):

```
git add .
git commit -m "deploy: actualiza estilos del header"
git push origin main
```

3) Reviso el progreso en GitHub → pestaña `Actions` → “Deploy to GitHub Pages”. Al terminar, los archivos quedan publicados en `gh-pages` y la web se sirve en `https://alonsovine.github.io/portfolio/`.

También puedo lanzar el workflow manualmente desde `Actions` (Run workflow). Si quiero que ese disparo manual ignore la condición de `deploy:`, puedo ajustar la condición del job a:

```
if: github.event_name == 'workflow_dispatch' || contains(github.event.head_commit.message, 'deploy:')
```

> Importante: en la configuración del repositorio, GitHub Pages debe servir desde la rama `gh-pages` (Settings → Pages → Source: gh-pages / root).

### 🏗️ Compilación local de producción

```
npm run build
```

El output se deja en `dist/portfolio`. En el workflow de CI se añade `--base-href=/portfolio/` porque la web se sirve bajo `/portfolio/` (esto es clave para que las rutas y assets funcionen en GitHub Pages).

---

## 🧾 Explicación detallada del workflow (`deploy.yml`)

Ruta: `.github/workflows/deploy.yml`

- Triggers (`on`):
  - `push` a `main` (ignoro cambios en `README.md` para no desplegar solo por docs).
  - `workflow_dispatch` para lanzarlo manualmente desde la UI de GitHub.
- Condición del job:
  - `if: contains(github.event.head_commit.message, 'deploy:')` → solo despliego si el último commit del push incluye `deploy:`.
- Permisos:
  - `permissions: contents: write` → necesarios para que `gh-pages` pueda escribir en la rama `gh-pages`.
- Pasos clave:
  - `actions/checkout@v3` con `fetch-depth: 0` para traer historial completo (recomendado por la acción de gh-pages).
  - `actions/setup-node@v3` con Node 16 y `cache: npm` para acelerar instalaciones.
  - `npm ci` para instalaciones reproducibles (usa `package-lock.json`).
  - Build Angular con: `npm run build -- --output-path=dist/portfolio --base-href=/portfolio/`.
  - Crear `.nojekyll` para evitar que GitHub Pages procese con Jekyll y oculte recursos con `_`.
  - Publicación con `peaceiris/actions-gh-pages@v3` apuntando a `publish_dir: ./dist/portfolio`.

### 🛠️ Problemas típicos y cómo los resuelvo

- 404 tras desplegar: reviso que Pages está configurado a `gh-pages` y que el `base-href` es `/portfolio/`.
- Assets que no cargan: suele ser `base-href` incorrecto. En repos de usuario/proyecto debe ser `/<nombre-repo>/`.
- El workflow no arranca: confirmo que el commit HEAD del push tiene `deploy:` y que tengo Actions habilitado para el repo.
- Cache rara de npm: reintento borrando cache o forzando una instalación limpia (quitar temporalmente `cache: npm`).

---

## 🧭 Mantenimiento

- Actualizaciones de Angular: actualizo minor/patch con el CLI (`ng update`).
- Dependencias: subo lo necesario y pruebo local antes de desplegar.
- Commits: sigo una convención simple (ej.: `feat:`, `fix:`, `chore:`). Para desplegar, uso `deploy:` para que el pipeline se ejecute.

Si quisiera forzar estos formatos de commit en local, puedo añadir `commitlint + husky` para validar los mensajes antes de cada commit.

---

## 🗺️ Roadmap breve

- Pequeñas mejoras visuales y animaciones.
- Refactorización ligera de estilos SCSS.
- Validaciones extra en el formulario de contacto.

---

## 📮 Contacto

Si has llegado hasta aquí y quieres dar feedback o curiosear más, ¡genial! Me encanta automatizar cosas y cuidar los detalles de frontend, así que cualquier idea es bienvenida.

