# Visión — portfolio inmersivo

Sustituto futuro de `portfolioR` (que sigue en producción en `alonsovine.github.io/portfolioR/`). Este proyecto se publicará en `alonsovine.github.io/portfolio/`.

## Concepto

El visitante se sienta en el escritorio de Alonso y elige a qué pantalla mirar, como hace él a diario.

1. **Intro: retrato.** Primer plano de Alonso de frente, a la altura de los ojos (cuello hacia arriba, sentado en la silla). Al pasar el ratón por encima, la zona bajo el cursor se transforma en código **estilo Matrix** (máscara circular de borde suave, mismo truco que landonorris.com con el casco). Base: `AsciiPortrait.tsx` de portfolioR.
2. **Transición a primera persona.** A la mínima interacción, la cámara pasa a la vista de Alonso: teclado, ratón, móvil en soporte tras el teclado, portátil elevado a la izquierda, ultrawide en el centro, pantalla a la derecha, mando de Xbox a la izquierda.
3. **Tres pantallas, tres secciones:**
   - **Izquierda (portátil): juegos.** Animación de coger el mando y primer plano de la pantalla. Space Invaders y la beta del juego en JavaScript (iframes).
   - **Centro (ultrawide): CV.** Experiencia, formación, skills: el contenido del portfolio actual.
   - **Derecha: proyectos** (no juegos), empezando por los más espectaculares (Prensa, Liberty…).

## Decisiones tomadas

- **3D en tiempo real** con React Three Fiber + drei, estilo semirrealista con iluminación horneada en Blender. Nada de cara 3D realista (riesgo de valle inquietante): la persona aparece en foto o vídeo real en la intro.
- **Contenido como HTML** proyectado en las pantallas 3D (`<Html>` de drei o CSS3D), no como texturas.
- **Sitio estático** (`output: "export"`) en GitHub Pages, igual que portfolioR. Sin backend.
- **Versión clásica siempre accesible** (saltar intro, móvil, `prefers-reduced-motion`, SEO).
- El contenido (i18n es/en, assets, CV) se **copia** desde portfolioR cuando haga falta; portfolioR no se toca.

## Fases

0. **Retrato Matrix**: la intro 2D con hover.
1. **Spike 3D**: escritorio con bloques simples, transiciones de cámara a las 3 pantallas, una pantalla con HTML real. Medir rendimiento en portátil y móvil.
2. **Assets**: modelado y bake del escritorio en Blender, carga en GLB comprimido (Draco/meshopt).
3. **Contenido**: CV, proyectos y juegos dentro de las pantallas, con i18n.
4. **Pulido y fallback**: móvil, accesibilidad, versión clásica, despliegue.
