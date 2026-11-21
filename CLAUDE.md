@AGENTS.md

# CLAUDE.md — portfolio inmersivo

Nuevo portfolio de Alonso Viñé: escritorio 3D en primera persona donde cada pantalla es una sección. **Lee `docs/vision.md` antes de proponer cambios.**

Stack: Next.js 16 (App Router) + React 19 + TS + Tailwind 4 + React Three Fiber / drei / three. Export estático (`output: "export"`) para GitHub Pages bajo `/portfolio` (basePath solo en producción).

## Comandos

```powershell
npm run dev     # http://localhost:3000
npm run build   # genera /out
npm run lint
```

## Reglas

- Solo SSG: nada de Route Handlers, Server Actions, ISR, middleware, Cache Components ni PPR (rompen el export).
- Rutas a assets prefijadas con `process.env.NEXT_PUBLIC_BASE_PATH || ""`.
- Componentes 3D en client components cargados de forma diferida; nunca bloquear el primer render con el canvas.
- Respetar `prefers-reduced-motion` y ofrecer siempre la versión clásica.
- Contenido visible en diccionarios i18n (es/en), no en componentes.
- `C:\proyectos\portfolioR` es la web en producción y referencia de contenido: se copia de ahí, no se modifica desde este proyecto.
- Commits con Conventional Commits, sin trailers de co-autoría.
